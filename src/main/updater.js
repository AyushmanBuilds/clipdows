// Auto-update via GitHub Releases (electron-updater).
// Checks shortly after launch and every few hours, downloads in the background,
// and installs when the user quits (or immediately if they click the notification /
// tray item). Does nothing in development (unpackaged) runs, and nothing in the Microsoft Store
// (MSIX) build: the Store updates those installs itself and does not allow self-updating.
const { app, Notification, dialog } = require('electron');

let autoUpdater = null;
let opts = { beforeInstall: () => {}, icon: undefined };
let manualCheck = false;
let downloadedVersion = null;
let timer = null;

// Electron sets process.windowsStore when the app runs from an MSIX / Microsoft Store install.
const IS_STORE = !!process.windowsStore;

const FIRST_CHECK_MS = 15 * 1000;
const INTERVAL_MS = 4 * 60 * 60 * 1000;

function toast(title, body, onClick) {
  try {
    if (!Notification.isSupported()) return;
    const n = new Notification({ title, body, icon: opts.icon });
    if (onClick) n.on('click', onClick);
    n.show();
  } catch { /* ignore */ }
}

function installNow() {
  if (!autoUpdater) return;
  try { opts.beforeInstall(); } catch { /* ignore */ }
  autoUpdater.quitAndInstall(false, true); // not silent, relaunch after install
}

function init(options = {}) {
  opts = { ...opts, ...options };
  if (!app.isPackaged || IS_STORE) return; // no updates in dev; the Store updates its own installs
  try {
    ({ autoUpdater } = require('electron-updater'));
  } catch (err) {
    console.warn('[updater] electron-updater not available:', err.message);
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on('update-available', (info) => {
    if (manualCheck) toast('ClipDows update found', `Downloading version ${info.version}…`);
  });
  autoUpdater.on('update-not-available', () => {
    if (manualCheck) toast('ClipDows is up to date', `You have the latest version (${app.getVersion()}).`);
    manualCheck = false;
  });
  autoUpdater.on('update-downloaded', (info) => {
    downloadedVersion = info.version;
    manualCheck = false;
    toast(
      `ClipDows ${info.version} is ready`,
      'Click to restart and update now, or it will install next time you quit.',
      installNow
    );
  });
  autoUpdater.on('error', (err) => {
    console.warn('[updater] error:', err && err.message);
    if (manualCheck) toast('Update check failed', 'Could not reach GitHub. Try again later.');
    manualCheck = false;
  });

  setTimeout(checkQuietly, FIRST_CHECK_MS);
  timer = setInterval(checkQuietly, INTERVAL_MS);
}

function checkQuietly() {
  if (!autoUpdater) return;
  autoUpdater.checkForUpdates().catch(() => {});
}

/** Tray menu → "Check for Updates". */
function checkNow() {
  if (IS_STORE) {
    toast('ClipDows', 'Updates come through the Microsoft Store. Open the Store app → Library to check.');
    return;
  }
  if (!app.isPackaged || !autoUpdater) {
    toast('ClipDows', 'Updates are only available in the installed version.');
    return;
  }
  if (downloadedVersion) { installNow(); return; }
  manualCheck = true;
  autoUpdater.checkForUpdates().catch(() => { manualCheck = false; });
}

module.exports = { init, checkNow };