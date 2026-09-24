const { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, screen, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const db = require('./db');
const watcher = require('./clipboardWatcher');
const autoPaste = require('./autoPaste');
const googleAuth = require('./googleAuth');

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

function createDashboardWindow() {
  if (dashboardWindow) {
    dashboardWindow.show();
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
    },
  });

  dashboardWindow.loadFile(path.join(__dirname, '..', 'dashboard', 'dashboard.html'));

  dashboardWindow.once('ready-to-show', () => {
    dashboardWindow.show();
  });

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

const PRIMARY_HOTKEY = 'CapsLock';
const FALLBACK_HOTKEY = 'Control+Space';

function registerShortcuts() {
  const primaryOk = globalShortcut.register(PRIMARY_HOTKEY, togglePopup);
  if (primaryOk) {
    console.log(`[main] Registered hotkey: ${PRIMARY_HOTKEY}`);
    return;
  }
  console.warn(`[main] Failed to register ${PRIMARY_HOTKEY}, trying fallback ${FALLBACK_HOTKEY}`);
  const fallbackOk = globalShortcut.register(FALLBACK_HOTKEY, togglePopup);
  if (fallbackOk) {
    console.log(`[main] Registered fallback hotkey: ${FALLBACK_HOTKEY}`);
  } else {
    console.warn(`[main] Failed to register fallback hotkey ${FALLBACK_HOTKEY} too. Use the tray icon to open ClipDows.`);
  }
}

app.whenReady().then(() => {
  if (app.isPackaged) Menu.setApplicationMenu(null);
  createTray();
  registerShortcuts();
  watcher.start((newItem) => {
    if (dashboardWindow) dashboardWindow.webContents.send('items:updated', newItem);
    // Push every freshly-captured item up to Firestore too, so it's on the
    // phone in real time. The renderer owns the Firebase session (it's
    // already signed in there), so main.js just hands the item off.
    if (dashboardWindow) dashboardWindow.webContents.send('cloud:push', newItem);
  });
}).catch((err) => {
  console.error('[main] Failed to start ClipDows:', err);
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  watcher.stop();
});

// ---------- helpers ----------
function notifyItemsChanged(payload = null) {
  if (dashboardWindow) dashboardWindow.webContents.send('items:updated', payload);
  if (popupWindow) popupWindow.webContents.send('items:updated', payload);
}

// ---------- IPC handlers ----------

// Which account's private database is active (null = signed out).
ipcMain.handle('session:set', (_evt, uid) => {
  db.setUser(uid || null);
  notifyItemsChanged(null);
  return { ok: true };
});

ipcMain.handle('items:get', (_evt, opts) => {
  return { items: db.getItems(opts || {}), pinned: db.getPinned(), trashCount: db.getTrashCount() };
});

ipcMain.handle('items:paste', async (_evt, id) => {
  const row = db.getItem(id);
  if (!row) return { ok: false };
  watcher.writeToClipboard(row);
  if (dashboardWindow) dashboardWindow.hide();
  await autoPaste.simulatePaste();
  return { ok: true };
});

ipcMain.handle('items:copyOnly', (_evt, id) => {
  const row = db.getItem(id);
  if (!row) return { ok: false };
  watcher.writeToClipboard(row);
  return { ok: true };
});

ipcMain.handle('items:togglePin', (_evt, id) => {
  db.togglePin(id);
  const updated = db.getItem(id);
  if (dashboardWindow) dashboardWindow.webContents.send('items:updated', updated);
  if (popupWindow) popupWindow.webContents.send('items:updated', updated);
  return { ok: true };
});

ipcMain.handle('items:trash', (_evt, id) => {
  db.trashItem(id);
  return { ok: true };
});

// Multi-select actions: trash | restore | delete | pin | unpin | emptyTrash | clearUnpinned
ipcMain.handle('items:bulk', (_evt, { action, ids }) => {
  const count = db.bulk(action, Array.isArray(ids) ? ids : []);
  notifyItemsChanged(null);
  return { ok: true, count };
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

ipcMain.handle('snippets:create', (_evt, { title, content, folder }) => {
  if (!db.hasSession()) return { ok: false };
  const snippet = db.insertSnippet({ id: crypto.randomUUID(), title, content, folder });
  // Snippets also show up in the clipboard list as a 'snippet' type item so they appear
  // alongside everything else in "All Items" / the Snippets tab.
  const item = db.insertItem({
    id: crypto.randomUUID(),
    type: 'snippet',
    content: content,
    preview: title,
    char_count: String(content || '').length,
  });
  if (dashboardWindow) dashboardWindow.webContents.send('items:updated', item);
  if (popupWindow) popupWindow.webContents.send('items:updated', item);
  return { ok: true, snippet, item };
});

// Settings that need the main process: tray, launch at login, title-bar colours.
ipcMain.on('settings:apply', (_evt, s) => {
  try {
    if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: !!s.startup });
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
  const saved = db.insertItem({
    id: item.id || crypto.randomUUID(),
    type: item.type,
    content: item.content,
    preview: item.preview,
    char_count: item.char_count,
    created_at: item.created_at,
  });
  if (!saved) return { ok: false };
  watcher.writeToClipboard(saved); // land it on the local OS clipboard too
  if (dashboardWindow) dashboardWindow.webContents.send('items:updated', saved);
  return { ok: true, item: saved };
});

ipcMain.handle('cloud:deviceLinked', (_evt, device) => {
  if (dashboardWindow) dashboardWindow.webContents.send('devices:updated', device);
  return { ok: true };
});