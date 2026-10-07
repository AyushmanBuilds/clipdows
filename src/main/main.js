const { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, screen, nativeImage, Notification, safeStorage, clipboard, dialog } = require('electron');
process.on('uncaughtException', (err) => console.error('[main] uncaught:', err));
process.on('unhandledRejection', (err) => console.error('[main] unhandled rejection:', err));

// Only one ClipDows may run (two would each capture the clipboard). Launching it a second
// time (e.g. clicking the shortcut while it's running hidden in the tray) just opens the window.
const gotInstanceLock = app.requestSingleInstanceLock();
if (!gotInstanceLock) app.quit();
let isQuitting = false;
app.on('before-quit', () => { isQuitting = true; });
// Windows starts us at login with this flag so we can stay out of the way (tray only).
const LAUNCHED_HIDDEN = process.argv.includes('--hidden');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const db = require('./db');
const watcher = require('./clipboardWatcher');
const autoPaste = require('./autoPaste');
const prefs = require('./prefs');
const sensitive = require('./sensitive');
const sourceApp = require('./sourceApp');
const ocr = require('./ocr');
const plan = require('./plan');
const focusReview = require('./focusReview');
const focusClassifier = require('./ai/classifier');
const { TOPICS } = require('./ai/topics');
const snippets = require('./snippets');
const triggers = require('./triggers');
const updater = require('./updater');
const storeUpdater = require('./storeUpdater');

let popupWindow = null;
let dashboardWindow = null;
let tray = null;
let currentThemeDark = false;
let hasCustomWallpaper = false;
const POPUP_WIDTH = 380;
const POPUP_HEIGHT = 460;

// Single source of truth for the ClipDows brand icon (tray, taskbar/dock, and
// window icon). Same file the dashboard uses as its logo — see dashboard.html.
const APP_ICON_PATH = path.join(__dirname, '..', '..', 'assets', 'tray-icon.png');
const WALLPAPER_DIR = path.join(app.getPath('userData'), 'appearance');
const WALLPAPER_META_PATH = path.join(WALLPAPER_DIR, 'wallpaper.json');
const WALLPAPER_TYPES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', bmp: 'image/bmp' };
const WALLPAPER_MAX_BYTES = 10 * 1024 * 1024;

function getWallpaper() {
  try {
    const meta = JSON.parse(fs.readFileSync(WALLPAPER_META_PATH, 'utf8'));
    if (!meta || typeof meta.file !== 'string' || !/^wallpaper\.(png|jpe?g|webp|bmp)$/i.test(meta.file)) return null;
    const file = path.join(WALLPAPER_DIR, meta.file);
    const bytes = fs.readFileSync(file);
    if (bytes.length > WALLPAPER_MAX_BYTES) return null;
    const ext = path.extname(file).slice(1).toLowerCase();
    return { dataUrl: `data:${WALLPAPER_TYPES[ext]};base64,${bytes.toString('base64')}`, fileName: typeof meta.originalName === 'string' ? meta.originalName : 'Custom wallpaper' };
  } catch { return null; }
}
hasCustomWallpaper = !!getWallpaper();

function updateDashboardTitleBar() {
  if (!dashboardWindow) return;
  dashboardWindow.setTitleBarOverlay({
    color: hasCustomWallpaper ? 'rgba(0, 0, 0, 0)' : currentThemeDark ? '#0C0E14' : '#F2F5FB',
    symbolColor: currentThemeDark ? '#CBD5E1' : '#475569',
    height: 40,
  });
}

function dashboardWindowMode() {
  return dashboardWindow && (dashboardWindow.isMaximized() || dashboardWindow.isFullScreen()) ? 'maximized' : 'windowed';
}
function broadcastDashboardWindowMode() {
  if (dashboardWindow && !dashboardWindow.isDestroyed()) dashboardWindow.webContents.send('window:dashboardModeChanged', dashboardWindowMode());
}

function broadcastWallpaper(wallpaper) {
  [dashboardWindow, popupWindow].forEach((win) => {
    if (win && !win.isDestroyed()) win.webContents.send('theme:wallpaperChanged', wallpaper ? wallpaper.dataUrl : '', wallpaper ? wallpaper.fileName : '');
  });
}

function loadAppIcon() {
  if (fs.existsSync(APP_ICON_PATH)) return nativeImage.createFromPath(APP_ICON_PATH);
  console.warn(`[main] App icon not found at ${APP_ICON_PATH} — falling back to Electron's default icon.`);
  return nativeImage.createEmpty();
}

function createPopupWindow() {
  popupWindow = new BrowserWindow({
    width: POPUP_WIDTH,
    height: POPUP_HEIGHT,
    show: false,
    frame: false,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: true,
    icon: loadAppIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  popupWindow.loadFile(path.join(__dirname, '..', 'popup', 'popup.html'));

  popupWindow.on('blur', () => {
    if (popupWindow && popupWindow.isVisible()) popupWindow.hide();
  });
}

function createDashboardWindow(opts) {
  // Tray menu items call this with a menu-item object, so only an explicit { hidden: true } counts.
  const startHidden = !!(opts && opts.hidden === true);
  if (dashboardWindow) {
    if (startHidden) return;
    dashboardWindow.show();
    if (dashboardWindow.isMinimized()) dashboardWindow.restore();
    dashboardWindow.focus();
    return;
  }

  dashboardWindow = new BrowserWindow({
    width: 1120,
    height: 720,
    minWidth: 780,
    minHeight: 500,
    show: false,
    title: 'ClipDows',
    backgroundColor: '#F2F5FB',
    autoHideMenuBar: true,
    // Frameless look: the dashboard draws its own top bar; Windows draws the
    // minimize / maximize / close buttons on top of it.
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: hasCustomWallpaper ? 'rgba(0, 0, 0, 0)' : '#F2F5FB', symbolColor: '#475569', height: 40 },
    icon: loadAppIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false, // the hidden window keeps the sign-in and phone sync running
    },
  });

  dashboardWindow.loadFile(path.join(__dirname, '..', 'dashboard', 'dashboard.html'));
  dashboardWindow.on('maximize', broadcastDashboardWindowMode);
  dashboardWindow.on('unmaximize', broadcastDashboardWindowMode);
  dashboardWindow.on('enter-full-screen', broadcastDashboardWindowMode);
  dashboardWindow.on('leave-full-screen', broadcastDashboardWindowMode);

  dashboardWindow.once('ready-to-show', () => {
    broadcastDashboardWindowMode();
    if (!startHidden) dashboardWindow.show();
  });

  // Closing the window keeps ClipDows running in the tray (capture + phone sync continue).
  // Without a tray icon there'd be no way back to a hidden window, so then it really closes.
  dashboardWindow.on('close', (e) => {
    if (!isQuitting && tray) { e.preventDefault(); dashboardWindow.hide(); }
  });
  // Windows shutdown / log-off must never be blocked by the close-to-tray rule above.
  dashboardWindow.on('session-end', () => { isQuitting = true; });

  dashboardWindow.on('closed', () => {
    dashboardWindow = null;
  });
}

function positionPopupNearCursor() {
  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);
  const { x: wx, y: wy, width: ww, height: wh } = display.workArea;

  let x = cursor.x - POPUP_WIDTH / 2;
  let y = cursor.y - POPUP_HEIGHT - 12;

  x = Math.max(wx + 8, Math.min(x, wx + ww - POPUP_WIDTH - 8));
  if (y < wy + 8) y = cursor.y + 20;

  popupWindow.setPosition(Math.round(x), Math.round(y));
}

function togglePopup() {
  if (dashboardWindow && dashboardWindow.isVisible() && dashboardWindow.isFocused()) {
    dashboardWindow.hide();
    return;
  }
  if (dashboardWindow) {
    dashboardWindow.show();
    if (dashboardWindow.isMinimized()) dashboardWindow.restore();
    dashboardWindow.focus();
    return;
  }
  createDashboardWindow();
}

function createTray() {
  // Windows shrinks tray icons aggressively — resize down from the source PNG
  // rather than shipping a separate asset, so there's only ever one icon file
  // to keep in sync with the in-app brand mark.
  const full = loadAppIcon();
  const icon = full.isEmpty() ? full : full.resize({ width: 16, height: 16, quality: 'best' });

  tray = new Tray(icon);
  const menu = Menu.buildFromTemplate([
    { label: 'Show Clipboard  (Caps Lock)', click: togglePopup },
    { label: 'Open Dashboard', click: createDashboardWindow },
    { label: `Paste Stack: start / stop  (${STACK_TOGGLE_KEY})`, click: toggleStack },
    { type: 'separator' },
    { label: 'Settings', click: createDashboardWindow },
    { label: 'Check for Updates', click: () => updater.checkNow() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.setToolTip('ClipDows');
  tray.setContextMenu(menu);
  tray.on('click', togglePopup);
}

// Global show/hide shortcut. Defaults to Alt; users can change it themselves
// from Settings -> Shortcuts once signed in. Their choice is device-level
// (not tied to any one account) and persisted in shortcut.json so it's
// re-applied on every launch.
const DEFAULT_HOTKEY = 'Alt+C';
const FALLBACK_HOTKEY = 'CapsLock';
const SHORTCUT_PATH = path.join(app.getPath('userData'), 'shortcut.json');

let currentHotkey = DEFAULT_HOTKEY;

function loadSavedHotkey() {
  try {
    const raw = fs.readFileSync(SHORTCUT_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.accelerator === 'string' && parsed.accelerator.trim()) {
      return parsed.accelerator.trim();
    }
  } catch { /* no saved shortcut yet, or file unreadable — fall back to default */ }
  return DEFAULT_HOTKEY;
}

function saveHotkey(accelerator) {
  try { fs.writeFileSync(SHORTCUT_PATH, JSON.stringify({ accelerator })); }
  catch (err) { console.warn('[main] Failed to save shortcut preference:', err); }
}

/** (Re)registers `accelerator` as the global show/hide hotkey. Returns true/false. */
let registeredHotkey = null; // only OUR show/hide hotkey is unregistered here, so the paste-stack keys survive
function applyHotkey(accelerator) {
  if (registeredHotkey) { try { globalShortcut.unregister(registeredHotkey); } catch { /* ignore */ } registeredHotkey = null; }
  let ok = false;
  try {
    ok = globalShortcut.register(accelerator, togglePopup);
  } catch (err) {
    console.warn(`[main] Invalid accelerator "${accelerator}":`, err.message);
    ok = false;
  }
  if (ok) {
    registeredHotkey = accelerator;
    currentHotkey = accelerator;
    console.log(`[main] Registered hotkey: ${accelerator}`);
  }
  return ok;
}

function registerShortcuts() {
  currentHotkey = loadSavedHotkey();
  if (applyHotkey(currentHotkey)) return;

  console.warn(`[main] Failed to register ${currentHotkey}, trying fallback ${FALLBACK_HOTKEY}`);
  if (applyHotkey(FALLBACK_HOTKEY)) {
    console.log(`[main] Registered fallback hotkey: ${FALLBACK_HOTKEY}`);
  } else {
    console.warn(`[main] Failed to register fallback hotkey ${FALLBACK_HOTKEY} too. Use the tray icon to open ClipDows.`);
  }
}

app.on('second-instance', () => { if (app.isReady()) createDashboardWindow(); });

app.whenReady().then(() => {
  if (!gotInstanceLock) return; // a copy is already running; this one is exiting
  app.setAppUserModelId('com.ayushmanbuilds.clipdows'); // needed for Windows notifications
  if (app.isPackaged) Menu.setApplicationMenu(null);
  createTray();
  registerShortcuts();
  registerStackShortcuts();
  triggers.init({ watcher, autoPaste });
  watcher.start(handleStoredItem, () => {
    if (dashboardWindow) dashboardWindow.webContents.send('focusReview:changed');
  });
  setInterval(notifyFocusReview, 60 * 1000);
  setInterval(purgeSensitive, 5000); // auto-expire secrets

  // The dashboard window is what restores the sign-in and runs the phone sync, so it must exist
  // from the start. At Windows login it stays hidden (tray only); a normal launch shows it.
  createDashboardWindow({ hidden: LAUNCHED_HIDDEN });

  updater.init({ icon: loadAppIcon(), beforeInstall: () => { isQuitting = true; } });
}).catch((err) => {
  console.error('[main] Failed to start ClipDows:', err);
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});

app.on('will-quit', () => {
  triggers.stop();
  globalShortcut.unregisterAll();
  watcher.stop();
});

ipcMain.handle('storeUpdate:isAvailable', () => storeUpdater.isStorePackage());
ipcMain.handle('storeUpdate:check', () => storeUpdater.checkAndDownload(dashboardWindow));
ipcMain.handle('storeUpdate:install', async () => {
  const result = await storeUpdater.install(dashboardWindow);
  if (result.ok) {
    app.relaunch();
    app.quit();
  }
  return result;
});

// ---------- helpers ----------
function notifyItemsChanged(payload = null) {
  triggers.refresh();
  if (dashboardWindow) dashboardWindow.webContents.send('items:updated', payload);
  if (popupWindow) popupWindow.webContents.send('items:updated', payload);
}

function handleStoredItem(newItem) {
  if (dashboardWindow) dashboardWindow.webContents.send('items:updated', newItem);
  const L = plan.limits();
  if (dashboardWindow && !newItem.sensitive && (newItem.type !== 'image' || L.syncImages)) {
    dashboardWindow.webContents.send('cloud:push', { ...newItem, syncCap: L.syncItems });
  }
  if (L.history > 0) db.enforceRetention(L.history * 3);
  pushToStack(newItem);
  if (newItem.type === 'image' && prefs.ocr) ocr.enqueue(newItem, () => notifyItemsChanged(null));
}

function notifyFocusReview() {
  const { count, reminderCount, expiredCount, earliestExpiryMs } = focusReview.sweep();
  if ((expiredCount || reminderCount) && dashboardWindow) dashboardWindow.webContents.send('focusReview:changed');
  if (!count || !reminderCount) return;
  const hoursLeft = Math.max(1, Math.ceil(earliestExpiryMs / (60 * 60 * 1000)));
  try {
    if (!Notification.isSupported()) return;
    const notification = new Notification({
      title: 'A few clips are waiting in Focus Review',
      body: `${reminderCount} clip${reminderCount === 1 ? '' : 's'} waiting. The first expires in about ${hoursLeft} hour${hoursLeft === 1 ? '' : 's'}; check if you want to keep anything.`,
      silent: true,
      icon: loadAppIcon(),
    });
    notification.on('click', () => {
      createDashboardWindow();
      setTimeout(() => {
        if (dashboardWindow && !dashboardWindow.isDestroyed()) dashboardWindow.webContents.send('focusReview:open');
      }, 250);
    });
    notification.show();
  } catch (err) { console.warn('[focus] review reminder failed:', err.message); }
}

// ---------- sensitive items: auto-expiry ----------
function purgeSensitive() {
  const gone = db.purgeExpired();
  if (!gone.length) return;
  gone.forEach((it) => { if (it.type !== 'image') watcher.clearIfMatches(it.content); });
  notifyItemsChanged(null);
}

// ---------- paste stack ----------
// Ctrl+Alt+C  -> start / stop collecting. While ON, everything you copy is queued.
// Ctrl+Alt+V  -> paste the next queued item (first copied = first pasted).
const STACK_TOGGLE_KEY = 'Ctrl+Alt+C';
const STACK_PASTE_KEY = 'Ctrl+Alt+V';
let stackActive = false;
let stack = [];
let stackFullNotified = false;

function stackNotify(title, body) {
  try { if (Notification.isSupported()) new Notification({ title, body, silent: true, icon: loadAppIcon() }).show(); }
  catch { /* ignore */ }
}
function refreshStackTip() {
  if (tray) tray.setToolTip(stackActive ? `ClipDows — paste stack: ${stack.length} queued` : 'ClipDows');
}
function toggleStack() {
  stackActive = !stackActive;
  stack = []; stackFullNotified = false;
  refreshStackTip();
  stackNotify(stackActive ? 'Paste stack ON' : 'Paste stack OFF',
    stackActive ? `Copy items in order, then press ${STACK_PASTE_KEY} to paste them one by one.` : 'Back to normal clipboard.');
}
function pushToStack(item) {
  if (!stackActive || item.sensitive) return;
  const max = plan.limits().stack;
  if (max >= 0 && stack.length >= max) {
    if (!stackFullNotified) { stackFullNotified = true; stackNotify('Paste stack is full', `The Free plan holds ${max} items. Upgrade for unlimited.`); }
    return;
  }
  stack.push(item.id);
  refreshStackTip();
}
async function pasteFromStack() {
  if (!stackActive) return;
  let row = null;
  while (stack.length && !row) {
    row = db.getItem(stack.shift());
    if (row && row.trashed === 1) row = null;
  }
  if (!row) {
    stackActive = false; refreshStackTip();
    stackNotify('Paste stack empty', 'Nothing left to paste — stack turned off.');
    return;
  }
  watcher.writeToClipboard(row);
  await autoPaste.simulatePaste({ releaseModifiers: true });
  if (!stack.length) {
    stackActive = false;
    stackNotify('Paste stack finished', 'Everything has been pasted.');
  }
  refreshStackTip();
}
function registerStackShortcuts() {
  [[STACK_TOGGLE_KEY, toggleStack], [STACK_PASTE_KEY, pasteFromStack]].forEach(([key, fn]) => {
    try { if (!globalShortcut.register(key, fn)) console.warn(`[main] Could not register paste-stack key ${key} (in use elsewhere).`); }
    catch (err) { console.warn(`[main] Invalid paste-stack key ${key}:`, err.message); }
  });
}

// ---------- IPC handlers ----------

// Which account's private database is active (null = signed out).
ipcMain.handle('session:set', (_evt, uid) => {
  db.setUser(uid || null);
  plan.load(uid || null);
  focusReview.setUser(uid || null);
  stack = []; stackActive = false; refreshStackTip();
  purgeSensitive();                       // drop secrets that expired while the app was closed
  if (uid && prefs.ocr) ocr.backfill(() => notifyItemsChanged(null));
  notifyItemsChanged(null);
  if (uid) notifyFocusReview();
  return { ok: true };
});

ipcMain.handle('focusReview:list', () => focusReview.list());
ipcMain.handle('focusReview:exportSync', () => focusReview.exportSyncState());
ipcMain.handle('focusReview:mergeSync', (_evt, state) => {
  const result = focusReview.mergeSyncState(state);
  if (result.changed && dashboardWindow) dashboardWindow.webContents.send('focusReview:changed');
  return result;
});
ipcMain.handle('focusReview:delete', (_evt, id) => {
  const ok = focusReview.remove(String(id || ''));
  if (ok && dashboardWindow) dashboardWindow.webContents.send('focusReview:changed');
  return { ok };
});
ipcMain.handle('focusReview:keep', (_evt, id) => {
  const row = focusReview.get(String(id || ''));
  if (!row || !db.hasSession()) return { ok: false };
  const saved = db.insertItem({ ...row, updated_at: Date.now() });
  if (!saved) return { ok: false };
  focusReview.remove(row.id);
  handleStoredItem(saved);
  if (dashboardWindow) dashboardWindow.webContents.send('focusReview:changed');
  return { ok: true, item: saved };
});

ipcMain.handle('items:get', (_evt, opts) => {
  const cap = plan.limits().history;
  const o = { ...(opts || {}) };
  if (cap > 0 && !o.trashed) o.historyCap = cap;
  const lockedCount = cap > 0 ? Math.max(0, db.countUnpinned() - cap) : 0;
  return { items: db.getItems(o), pinned: db.getPinned(), trashCount: db.getTrashCount(), lockedCount };
});

// Snippets can use variables ({date}, {clipboard}, {cursor}...) on the Max plan.
function resolveForPaste(row) {
  if (row.type === 'snippet' && plan.limits().variables) {
    const ex = snippets.expand(row.content, clipboard.readText());
    return { row: { ...row, content: ex.text }, cursorBack: ex.cursorBack };
  }
  return { row, cursorBack: 0 };
}

ipcMain.handle('items:paste', async (_evt, id) => {
  const row = db.getItem(id);
  if (!row) return { ok: false };
  const ex = resolveForPaste(row);
  watcher.writeToClipboard(ex.row);
  if (dashboardWindow) dashboardWindow.hide();
  await autoPaste.simulatePaste();
  if (ex.cursorBack) await autoPaste.moveLeft(ex.cursorBack);
  return { ok: true };
});

ipcMain.handle('items:copyOnly', (_evt, id) => {
  const row = db.getItem(id);
  if (!row) return { ok: false };
  watcher.writeToClipboard(resolveForPaste(row).row);
  return { ok: true };
});

// Saves an image clip straight into the user's Downloads folder (unique file name, never overwrites).
ipcMain.handle('items:saveImage', (_evt, id) => {
  try {
    const row = db.getItem(id);
    if (!row || row.type !== 'image') return { ok: false, error: 'Not an image' };
    const m = /^data:image\/([\w+.-]+);base64,(.+)$/.exec(row.content || '');
    if (!m) return { ok: false, error: 'Image data missing' };
    let ext = m[1].toLowerCase().replace(/\+.*$/, '');
    if (ext === 'jpeg') ext = 'jpg';
    const d = new Date(row.created_at || Date.now());
    const p2 = (n) => String(n).padStart(2, '0');
    const base = `ClipDows-${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`;
    const dir = app.getPath('downloads');
    let file = path.join(dir, `${base}.${ext}`);
    for (let n = 2; fs.existsSync(file); n++) file = path.join(dir, `${base} (${n}).${ext}`);
    fs.writeFileSync(file, Buffer.from(m[2], 'base64'));
    return { ok: true, name: path.basename(file), dir };
  } catch (err) {
    console.warn('[main] saveImage failed:', err.message);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('items:togglePin', (_evt, id) => {
  const cur = db.getItem(id);
  const maxPins = plan.limits().pinned;
  if (cur && cur.pinned !== 1 && maxPins >= 0 && db.getPinned().length >= maxPins) return { ok: false, limit: 'pinned', max: maxPins };
  db.togglePin(id);
  const updated = db.getItem(id);
  if (dashboardWindow) dashboardWindow.webContents.send('items:updated', updated);
  if (popupWindow) popupWindow.webContents.send('items:updated', updated);
  return { ok: true };
});

ipcMain.handle('items:trash', (_evt, id) => {
  db.trashItem(id);
  triggers.refresh();
  return { ok: true };
});

// Multi-select actions: trash | restore | delete | pin | unpin | emptyTrash | clearUnpinned
ipcMain.handle('items:bulk', (_evt, { action, ids }) => {
  let list = Array.isArray(ids) ? ids : [];
  let limited = false;
  const maxPins = plan.limits().pinned;
  if (action === 'pin' && maxPins >= 0) {
    const room = Math.max(0, maxPins - db.getPinned().length);
    const fresh = list.filter((i) => { const it = db.getItem(i); return it && it.pinned !== 1; });
    if (fresh.length > room) { list = fresh.slice(0, room); limited = true; }
  }
  const count = db.bulk(action, list);
  notifyItemsChanged(null);
  return { ok: true, count, limited, limit: limited ? 'pinned' : undefined, max: maxPins };
});

ipcMain.handle('items:updateTags', (_evt, { id, tags }) => {
  db.updateTags(id, tags);
  const updated = db.getItem(id);
  if (dashboardWindow) dashboardWindow.webContents.send('items:updated', updated);
  return { ok: true, item: updated };
});

ipcMain.handle('items:updateContent', (_evt, { id, content }) => {
  const updated = db.updateContent(id, content);
  if (dashboardWindow) dashboardWindow.webContents.send('items:updated', updated);
  return { ok: !!updated, item: updated };
});

ipcMain.handle('snippets:create', (_evt, { title, content, folder, trigger }) => {
  if (!db.hasSession()) return { ok: false };
  const L = plan.limits();
  const have = db.getItems({ type: 'snippet', limit: 100000 }).length;
  if (L.snippets >= 0 && have >= L.snippets) return { ok: false, limit: 'snippets', max: L.snippets };
  let trig = String(trigger || '').trim().toLowerCase();
  if (trig) {
    if (!L.triggers) return { ok: false, limit: 'triggers' };
    if (!/^[;/]?[a-z0-9-]{2,20}$/.test(trig)) return { ok: false, error: 'Trigger: 2-20 letters, numbers or dashes, e.g. ;addr' };
    if (!/^[;/]/.test(trig)) trig = ';' + trig;
    if (triggers.conflicts(trig)) return { ok: false, error: 'That trigger clashes with another snippet trigger.' };
  }
  const snippet = db.insertSnippet({ id: crypto.randomUUID(), title, content, folder, trigger: trig });
  // Snippets also show up in the clipboard list as a 'snippet' type item so they appear
  // alongside everything else in "All Items" / the Snippets tab.
  const item = db.insertItem({
    id: crypto.randomUUID(),
    type: 'snippet',
    content: content,
    preview: title,
    char_count: String(content || '').length,
    trigger: trig,
  });
  triggers.refresh();
  if (dashboardWindow) dashboardWindow.webContents.send('items:updated', item);
  if (popupWindow) popupWindow.webContents.send('items:updated', item);
  return { ok: true, snippet, item };
});

// Settings that need the main process: tray, launch at login, title-bar colours.
ipcMain.handle('theme:getWallpaper', () => getWallpaper());

ipcMain.handle('theme:chooseWallpaper', async () => {
  const options = {
    title: 'Choose a wallpaper',
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: Object.keys(WALLPAPER_TYPES) }],
  };
  const result = dashboardWindow
    ? await dialog.showOpenDialog(dashboardWindow, options)
    : await dialog.showOpenDialog(options);
  if (result.canceled || !result.filePaths.length) return { canceled: true };

  const source = result.filePaths[0];
  const ext = path.extname(source).slice(1).toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(WALLPAPER_TYPES, ext)) return { ok: false, error: 'Choose a PNG, JPG, WEBP, or BMP image.' };
  try {
    const stat = fs.statSync(source);
    if (!stat.isFile() || stat.size === 0) return { ok: false, error: 'That image is empty or unavailable.' };
    if (stat.size > WALLPAPER_MAX_BYTES) return { ok: false, error: 'Choose an image smaller than 10 MB.' };
    if (nativeImage.createFromPath(source).isEmpty()) return { ok: false, error: 'ClipDows could not open that image.' };
    fs.mkdirSync(WALLPAPER_DIR, { recursive: true });
    const file = `wallpaper.${ext}`;
    fs.copyFileSync(source, path.join(WALLPAPER_DIR, file));
    for (const oldExt of Object.keys(WALLPAPER_TYPES)) {
      if (oldExt !== ext) {
        try { fs.unlinkSync(path.join(WALLPAPER_DIR, `wallpaper.${oldExt}`)); } catch { /* old version may not exist */ }
      }
    }
    fs.writeFileSync(WALLPAPER_META_PATH, JSON.stringify({ file, originalName: path.basename(source) }));
    const wallpaper = getWallpaper();
    if (!wallpaper) return { ok: false, error: 'ClipDows could not read that image.' };
    hasCustomWallpaper = true;
    updateDashboardTitleBar();
    broadcastWallpaper(wallpaper);
    return { ok: true, ...wallpaper };
  } catch (err) {
    console.warn('[main] Could not save wallpaper:', err);
    return { ok: false, error: 'Could not save that image. Check that you can access the file.' };
  }
});

ipcMain.handle('theme:clearWallpaper', () => {
  try {
    const meta = JSON.parse(fs.readFileSync(WALLPAPER_META_PATH, 'utf8'));
    if (meta && typeof meta.file === 'string' && /^wallpaper\.(png|jpe?g|webp|bmp)$/i.test(meta.file)) {
      try { fs.unlinkSync(path.join(WALLPAPER_DIR, meta.file)); } catch { /* already removed */ }
    }
  } catch { /* no saved wallpaper */ }
  try { fs.unlinkSync(WALLPAPER_META_PATH); } catch { /* already removed */ }
  hasCustomWallpaper = false;
  updateDashboardTitleBar();
  broadcastWallpaper(null);
  return { ok: true };
});

ipcMain.on('settings:apply', (_evt, s) => {
  const L = plan.limits();
  const previousFocusCapture = prefs.focusCapture;
  currentThemeDark = !!s.dark;
  const validTopics = new Set(TOPICS.map((topic) => topic.id));
  const focusTopics = L.focusTopics > 0 && Array.isArray(s.focusTopics)
    ? [...new Set(s.focusTopics.filter((id) => validTopics.has(id)))].slice(0, L.focusTopics)
    : [];
  const customTopics = L.focusTopics > focusTopics.length && Array.isArray(s.focusCustomTopics)
    ? s.focusCustomTopics.filter((topic) => topic && typeof topic.id === 'string' && /^custom-[a-z0-9-]+$/.test(topic.id)
      && typeof topic.label === 'string' && topic.label.trim() && typeof topic.prompt === 'string' && topic.prompt.trim())
      .slice(0, L.focusTopics - focusTopics.length).map((topic) => ({ id: topic.id, label: topic.label.trim().slice(0, 40), prompt: topic.prompt.trim().slice(0, 240) }))
    : [];
  prefs.set({ ...s, focusCapture: L.focusTopics > 0 && !!s.focusCapture && focusTopics.length + customTopics.length > 0, focusTopics, focusCustomTopics: customTopics, ignoredApps: L.appFilter ? s.ignoredApps : '', secretTtl: L.customExpiry ? s.secretTtl : 0 }); // plan-gated settings
  if (previousFocusCapture !== prefs.focusCapture) broadcastFocusCaptureState();
  try {
    if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: !!s.startup, args: ['--hidden'] });
    if (s.tray === false && tray) { tray.destroy(); tray = null; }
    else if (s.tray !== false && !tray) createTray();
    if (dashboardWindow) {
      updateDashboardTitleBar();
      dashboardWindow.setBackgroundColor(s.dark ? '#0C0E14' : '#F2F5FB');
    }
  } catch (err) {
    console.warn('[main] settings:apply failed', err);
  }
});

ipcMain.on('popup:hide', () => {
  if (popupWindow) popupWindow.hide();
});

ipcMain.on('dashboard:open', () => {
  createDashboardWindow();
});

// ---------- Cloud sync (paired phone) bridge ----------
// firestoreSync.js in the renderer owns the actual Firestore listeners; it
// calls these two whenever something arrives from a paired phone.

ipcMain.handle('cloud:itemReceived', (_evt, item) => {
  if (!db.hasSession()) return { ok: false };
  // Avoid double-inserting something the desktop itself just pushed up.
  if (db.isDuplicateOfLatest(item.content, item.type)) return { ok: true, skipped: true };
  const incoming = {
    id: item.id || crypto.randomUUID(),
    type: item.type,
    content: item.content,
    preview: item.preview,
    char_count: item.char_count,
    created_at: item.created_at,
  };
  if (prefs.guard) sensitive.mark(incoming); // e.g. an OTP sent from the phone
  const saved = db.insertItem(incoming);
  if (!saved) return { ok: false };
  watcher.writeToClipboard(saved); // land it on the local OS clipboard too
  if (saved.type === 'image' && prefs.ocr) ocr.enqueue(saved, () => notifyItemsChanged(null));
  if (dashboardWindow) dashboardWindow.webContents.send('items:updated', saved);
  return { ok: true, item: saved };
});

ipcMain.handle('cloud:deviceLinked', (_evt, device) => {
  if (dashboardWindow) dashboardWindow.webContents.send('devices:updated', device);
  return { ok: true };
});

// ---------- Plans ----------
function broadcastPlan() {
  [dashboardWindow, popupWindow].forEach((win) => {
    if (win && !win.isDestroyed()) win.webContents.send('plan:changed', plan.info());
  });
  if (plan.limits().focusTopics === 0 && prefs.focusCapture) prefs.set({ focusCapture: false });
  broadcastFocusCaptureState();
  triggers.refresh();
  notifyItemsChanged(null);
}
ipcMain.handle('plan:get', () => plan.info());
ipcMain.handle('plan:setDev', (_evt, t) => { if (app.isPackaged) return plan.info(); plan.setDev(t); broadcastPlan(); return plan.info(); });
ipcMain.handle('plan:setPaid', (_evt, p) => { plan.setPaid(p || {}); broadcastPlan(); return plan.info(); }); // payments step will call this
ipcMain.handle('plan:setTrial', (_evt, endsAt) => { plan.setTrial(endsAt); broadcastPlan(); return plan.info(); }); // server-granted trial (verified emails only)

// ---------- Encryption key vault ----------
// The sync key is protected by Windows DPAPI (via Electron safeStorage): only this Windows
// user on this PC can decrypt it, so the passphrase isn't asked on every launch.
const VAULT_DIR = path.join(app.getPath('userData'), 'vault');
const vaultFile = (uid) => path.join(VAULT_DIR, String(uid || '').replace(/[^a-zA-Z0-9_-]/g, '') + '.key');

ipcMain.handle('vault:load', (_evt, uid) => {
  try {
    if (!uid || !safeStorage.isEncryptionAvailable()) return null;
    const f = vaultFile(uid);
    return fs.existsSync(f) ? safeStorage.decryptString(fs.readFileSync(f)) : null;
  } catch { return null; }
});
ipcMain.handle('vault:save', (_evt, uid, keyB64) => {
  try {
    if (!uid || !safeStorage.isEncryptionAvailable()) return { ok: false };
    fs.mkdirSync(VAULT_DIR, { recursive: true });
    fs.writeFileSync(vaultFile(uid), safeStorage.encryptString(String(keyB64)));
    return { ok: true };
  } catch { return { ok: false }; }
});
ipcMain.handle('vault:clear', (_evt, uid) => {
  try { if (uid) fs.rmSync(vaultFile(uid), { force: true }); } catch { /* ignore */ }
  return { ok: true };
});

// Icon of the app a clip was copied from (cached in sourceApp.js)
ipcMain.handle('apps:icon', (_evt, exePath) => sourceApp.icon(exePath));

// ---------- Global shortcut (user-configurable, default Alt) ----------
ipcMain.handle('shortcut:get', () => ({ accelerator: currentHotkey, default: DEFAULT_HOTKEY }));

ipcMain.handle('shortcut:set', (_evt, accelerator) => {
  const next = String(accelerator || '').trim();
  if (!next) return { ok: false, error: 'Choose a key or combination first.' };
  if (next === currentHotkey) return { ok: true, accelerator: currentHotkey };

  const previous = currentHotkey;
  if (!applyHotkey(next)) {
    applyHotkey(previous); // restore whatever was working before the attempt
    return { ok: false, error: `"${next}" is already in use by another app, or can't be used as a global shortcut. Try a different key or combination.` };
  }
  saveHotkey(next);
  return { ok: true, accelerator: next };
});

function focusCaptureState() {
  const limit = plan.limits().focusTopics;
  return { tier: plan.tier(), enabled: !!prefs.focusCapture, available: limit > 0, hasTopics: prefs.focusTopics.length + prefs.focusCustomTopics.length > 0 };
}
function broadcastFocusCaptureState() {
  const state = focusCaptureState();
  [dashboardWindow, popupWindow].forEach((win) => {
    if (win && !win.isDestroyed()) win.webContents.send('focusCapture:changed', state);
  });
  return state;
}
ipcMain.handle('focusCapture:getState', () => focusCaptureState());
ipcMain.handle('window:getDashboardMode', () => dashboardWindowMode());
ipcMain.handle('focusCapture:setEnabled', (_evt, enabled) => {
  const state = focusCaptureState();
  if (enabled && !state.available) return { ok: false, reason: 'plan', ...state };
  if (enabled && !state.hasTopics) return { ok: false, reason: 'topics', ...state };
  prefs.set({ focusCapture: !!enabled });
  return { ok: true, ...broadcastFocusCaptureState() };
});
