// Which app did this clip come from? Uses the `active-win` package (ESM, so it is
// loaded with a dynamic import). If it isn't installed, everything degrades to "unknown".
const path = require('path');
const { app } = require('electron');

let activeWindowFn = null; // null = not tried yet, false = unavailable
async function load() {
  if (activeWindowFn !== null) return activeWindowFn;
  try {
    const m = await import('active-win');
    activeWindowFn = m.activeWindow || m.default || false;
  } catch (err) {
    console.warn('[sourceApp] active-win not available — run `npm i active-win`.', err.message);
    activeWindowFn = false;
  }
  return activeWindowFn;
}

const clean = (n) => String(n || '').replace(/\.exe$/i, '').trim();

async function current() {
  const fn = await load();
  if (!fn) return null;
  try {
    const w = await Promise.race([fn(), new Promise((r) => setTimeout(() => r(null), 400))]);
    if (!w || !w.owner) return null;
    const p = w.owner.path || '';
    const isSelf = p && p.toLowerCase() === process.execPath.toLowerCase();
    return { name: isSelf ? 'ClipDows' : clean(w.owner.name), path: p };
  } catch { return null; }
}

function isIgnored(src, list) {
  if (!src || !list || !list.length) return false;
  const hay = (clean(src.name) + ' ' + clean(path.basename(src.path || ''))).toLowerCase();
  return list.some((x) => hay.includes(x));
}

const iconCache = new Map();
async function icon(exePath) {
  if (!exePath) return null;
  if (iconCache.has(exePath)) return iconCache.get(exePath);
  let url = null;
  try { url = (await app.getFileIcon(exePath, { size: 'normal' })).toDataURL(); } catch { /* ignore */ }
  iconCache.set(exePath, url);
  return url;
}

module.exports = { current, isIgnored, icon };