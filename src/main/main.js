const { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, screen, nativeImage, Notification, safeStorage, clipboard } = require('electron');
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
const googleAuth = require('./googleAuth');
const prefs = require('./prefs');
const sensitive = require('./sensitive');
const sourceApp = require('./sourceApp');
const ocr = require('./ocr');
const plan = require('./plan');
const snippets = require('./snippets');
const triggers = require('./triggers');

let popupWindow = null;
let dashboardWindow = null;
let tray = null;
const POPUP_WIDTH = 380;
const POPUP_HEIGHT = 460;

// Single source of truth for the ClipDows brand icon (tray, taskbar/dock, and
// window icon). Same file the dashboard uses as its logo — see dashboard.html.
const APP_ICON_PATH = path.join(__dirname, '..', '..', 'assets', 'tray-icon.png');
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
    titleBarOverlay: { color: '#F2F5FB', symbolColor: '#475569', height: 40 },
    icon: loadAppIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false, // the hidden window keeps the sign-in and phone sync running
    },
  });

  dashboardWindow.loadFile(path.join(__dirname, '..', 'dashboard', 'dashboard.html'));

  dashboardWindow.once('ready-to-show', () => {
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
    { label: 'Check for Updates', click: () => {} },
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
  watcher.start((newItem) => {
    if (dashboardWindow) dashboardWindow.webContents.send('items:updated', newItem);
    // Push every freshly-captured item up to Firestore too, so it's on the
    // phone in real time. The renderer owns the Firebase session (it's
    // already signed in there), so main.js just hands the item off.
    // Secrets caught by the sensitive-data guard are NEVER uploaded.
    const L = plan.limits();
    if (dashboardWindow && !newItem.sensitive && (newItem.type !== 'image' || L.syncImages)) {
      dashboardWindow.webContents.send('cloud:push', { ...newItem, syncCap: L.syncItems });
    }
    if (L.history > 0) db.enforceRetention(L.history * 3); // keep storage bounded; older clips beyond the plan window are locked, not deleted right away
    pushToStack(newItem);
    if (newItem.type === 'image' && prefs.ocr) ocr.enqueue(newItem, () => notifyItemsChanged(null));
  });
  setInterval(purgeSensitive, 5000); // auto-expire secrets

  // The dashboard window is what restores the sign-in and runs the phone sync, so it must exist
  // from the start. At Windows login it stays hidden (tray only); a normal launch shows it.
  createDashboardWindow({ hidden: LAUNCHED_HIDDEN });
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

// ---------- helpers ----------
function notifyItemsChanged(payload = null) {
  triggers.refresh();
  if (dashboardWindow) dashboardWindow.webContents.send('items:updated', payload);
  if (popupWindow) popupWindow.webContents.send('items:updated', payload);
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
  stack = []; stackActive = false; refreshStackTip();
  purgeSensitive();                       // drop secrets that expired while the app was closed
  if (uid && prefs.ocr) ocr.backfill(() => notifyItemsChanged(null));
  notifyItemsChanged(null);
  return { ok: true };
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
ipcMain.on('settings:apply', (_evt, s) => {
  const L = plan.limits();
  prefs.set({ ...s, ignoredApps: L.appFilter ? s.ignoredApps : '', secretTtl: L.customExpiry ? s.secretTtl : 0 }); // Pro features
  try {
    if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: !!s.startup, args: ['--hidden'] });
    if (s.tray === false && tray) { tray.destroy(); tray = null; }
    else if (s.tray !== false && !tray) createTray();
    if (dashboardWindow) {
      dashboardWindow.setTitleBarOverlay(s.dark
        ? { color: '#0C0E14', symbolColor: '#CBD5E1', height: 40 }
        : { color: '#F2F5FB', symbolColor: '#475569', height: 40 });
      dashboardWindow.setBackgroundColor(s.dark ? '#0C0E14' : '#F2F5FB');
    }
  } catch (err) {
    console.warn('[main] settings:apply failed', err);
  }
});

ipcMain.handle('auth:google', async () => {
  const result = await googleAuth.signIn();
  // bring ClipDows back to the front once the browser step is done
  if (dashboardWindow) {
    dashboardWindow.show();
    if (dashboardWindow.isMinimized()) dashboardWindow.restore();
    dashboardWindow.focus();
  }
  return result;
});

ipcMain.on('auth:googleCancel', () => googleAuth.cancel());

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
  if (dashboardWindow) dashboardWindow.webContents.send('plan:changed', plan.info());
  triggers.refresh();
  notifyItemsChanged(null);
}
ipcMain.handle('plan:get', () => plan.info());
ipcMain.handle('plan:setDev', (_evt, t) => { if (app.isPackaged) return plan.info(); plan.setDev(t); broadcastPlan(); return plan.info(); });
ipcMain.handle('plan:setPaid', (_evt, p) => { plan.setPaid(p || {}); broadcastPlan(); return plan.info(); }); // payments step will call this

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