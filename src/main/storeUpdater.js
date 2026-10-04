const path = require('path');
const { spawn } = require('child_process');
const { app } = require('electron');

let activeRun = null;
let updateDownloaded = false;

function emit(win, state, detail = {}) {
  if (win && !win.isDestroyed()) win.webContents.send('storeUpdate:state', { state, ...detail });
}

function helperPath() {
  const unpacked = app.getAppPath().replace(/app\.asar$/i, 'app.asar.unpacked');
  return path.join(unpacked, 'build', 'store-update', 'ClipDows.StoreUpdate.exe');
}

function windowHandle(win) {
  if (!win || win.isDestroyed()) throw new Error('Open the ClipDows window before checking Store updates.');
  const bytes = win.getNativeWindowHandle();
  return bytes.length >= 8 ? bytes.readBigUInt64LE(0).toString(16) : bytes.readUInt32LE(0).toString(16);
}

function decodeError(value) {
  try { return Buffer.from(value, 'base64').toString('utf8'); }
  catch { return 'The Microsoft Store update operation failed.'; }
}

function run(command, win) {
  if (!process.windowsStore) {
    return Promise.resolve({ ok: false, state: 'error', message: 'Store updates are available only in the Microsoft Store version of ClipDows.' });
  }
  if (activeRun) return Promise.resolve({ ok: false, state: 'busy', message: 'An update operation is already running.' });
  if (command === 'install' && !updateDownloaded) {
    return Promise.resolve({ ok: false, state: 'error', message: 'Download the update before installing it.' });
  }

  let hwnd;
  try { hwnd = windowHandle(win); }
  catch (error) { return Promise.resolve({ ok: false, state: 'error', message: error.message }); }

  return new Promise((resolve) => {
    let lineBuffer = '';
    let lastState = null;
    let lastMessage = '';
    const child = spawn(helperPath(), [command, hwnd], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    activeRun = { command, child };

    const handleLine = (line) => {
      const [kind, value] = line.trim().split('\t');
      if (kind === 'AVAILABLE') {
        lastState = 'downloading';
        emit(win, lastState, { percent: 0, count: Number(value) || 1 });
      } else if (kind === 'PROGRESS') {
        lastState = 'downloading';
        emit(win, lastState, { percent: Math.max(0, Math.min(100, Number(value) || 0)) });
      } else if (kind === 'NO_UPDATES') {
        lastState = 'current';
        emit(win, lastState);
      } else if (kind === 'READY') {
        updateDownloaded = true;
        lastState = 'ready';
        emit(win, lastState);
      } else if (kind === 'INSTALLING') {
        lastState = 'installing';
        emit(win, lastState);
      } else if (kind === 'INSTALLED') {
        updateDownloaded = false;
        lastState = 'installed';
        emit(win, lastState);
      } else if (kind === 'ERROR') {
        lastState = 'error';
        lastMessage = decodeError(value || '');
        updateDownloaded = false;
        emit(win, lastState, { message: lastMessage });
      }
    };

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      lineBuffer += chunk;
      const lines = lineBuffer.split(/\r?\n/);
      lineBuffer = lines.pop();
      lines.forEach(handleLine);
    });
    child.stderr.on('data', (chunk) => console.warn('[storeUpdater]', String(chunk).trim()));
    child.on('error', (error) => {
      lastState = 'error';
      lastMessage = error.message;
      emit(win, lastState, { message: lastMessage });
    });
    child.on('close', (code) => {
      if (lineBuffer.trim()) handleLine(lineBuffer);
      activeRun = null;
      if (!lastState || (code !== 0 && lastState !== 'error')) {
        lastState = 'error';
        lastMessage = lastMessage || `Store update helper exited with code ${code}.`;
        emit(win, lastState, { message: lastMessage });
      }
      resolve({ ok: lastState !== 'error', state: lastState, message: lastMessage });
    });
  });
}

module.exports = {
  isStorePackage: () => !!process.windowsStore,
  checkAndDownload: (win) => run('check', win),
  install: (win) => run('install', win),
};
