const { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, screen, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const db = require('./db');
const watcher = require('./clipboardWatcher');
const autoPaste = require('./autoPaste');

let popupWindow = null;
let dashboardWindow = null;
let tray = null;
const POPUP_WIDTH = 380;
const POPUP_HEIGHT = 460;

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
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  popupWindow.loadFile(path.join(__dirname, '..', 'popup', 'popup.html'));

  // hide (not close) when it loses focus, like a spotlight/launcher
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
    width: 1040,
    height: 680,
    minWidth: 760,
    minHeight: 480,
    show: false,
    frame: true,
    title: 'ClipDows',
    backgroundColor: '#14151C',
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
  if (y < wy + 8) y = cursor.y + 20; // flip below cursor if not enough room above

  popupWindow.setPosition(Math.round(x), Math.round(y));
}

function togglePopup() {
  if (!popupWindow) return;
  if (popupWindow.isVisible()) {
    popupWindow.hide();
    return;
  }
  positionPopupNearCursor();
  popupWindow.show();
  popupWindow.focus();
  popupWindow.webContents.send('popup:shown');
}

function createTray() {
  // main.js lives at <root>/src/main/main.js, and assets/ lives at <root>/assets,
  // so we need to go up two levels (out of main/, out of src/) to reach it.
  const iconPath = path.join(__dirname, '..', '..', 'assets', 'tray-icon.png');
  let icon;

  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
  } else {
    console.warn(`[main] Tray icon not found at ${iconPath} — using a blank fallback icon. Add a real tray-icon.png there before packaging.`);
    icon = nativeImage.createEmpty();
  }

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

// CapsLock as the primary trigger (single dedicated key, nothing else uses it),
// with Ctrl+Space as an easy fallback if CapsLock can't be registered.
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
  createPopupWindow();
  createTray();
  registerShortcuts();
  watcher.start((newItem) => {
    if (popupWindow) popupWindow.webContents.send('items:updated', newItem);
    if (dashboardWindow) dashboardWindow.webContents.send('items:updated', newItem);
  });
}).catch((err) => {
  console.error('[main] Failed to start ClipDows:', err);
});

app.on('window-all-closed', (e) => {
  // ClipDows lives in the tray — don't quit when the popup/dashboard closes
  e.preventDefault();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  watcher.stop();
});

// ---------- IPC handlers ----------

ipcMain.handle('items:get', (_evt, opts) => {
  return { items: db.getItems(opts || {}), pinned: db.getPinned() };
});

ipcMain.handle('items:paste', async (_evt, id) => {
  const row = db.getItem(id);
  if (!row) return { ok: false };
  watcher.writeToClipboard(row);
  if (popupWindow) popupWindow.hide();
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

ipcMain.on('popup:hide', () => {
  if (popupWindow) popupWindow.hide();
});

ipcMain.on('dashboard:open', () => {
  createDashboardWindow();
});