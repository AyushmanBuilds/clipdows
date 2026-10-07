const { clipboard, nativeImage } = require('electron');
const crypto = require('crypto');
const db = require('./db');
const prefs = require('./prefs');
const sensitive = require('./sensitive');
const sourceApp = require('./sourceApp');
const plan = require('./plan');
const focusReview = require('./focusReview');
const focusClassifier = require('./ai/classifier');

const POLL_INTERVAL_MS = 600;
const MAX_TEXT_PREVIEW = 140;

let lastSignature = null;
let intervalHandle = null;
let onNewItemCallback = null;
let onFocusReviewCallback = null;
let busy = false;

function detectType(text) {
  if (!text) return 'text';
  const urlRegex = /^(https?:\/\/|www\.)\S+$/i;
  if (urlRegex.test(text.trim())) return 'link';

  const codeHints = [
    /^\s*(const|let|var|function|class|import|export|def|SELECT|<\?php|#include)\b/,
    /[{};]\s*$/m,
    /=>/,
  ];
  const looksLikeCode = codeHints.some((re) => re.test(text)) && text.length > 20;
  if (looksLikeCode) return 'code';

  return 'text';
}

function makePreview(type, content) {
  if (type === 'image') return 'Image';
  const flat = content.replace(/\s+/g, ' ').trim();
  return flat.length > MAX_TEXT_PREVIEW ? flat.slice(0, MAX_TEXT_PREVIEW) + '…' : flat;
}

function hashContent(str) {
  return crypto.createHash('sha1').update(str).digest('hex');
}

/** Foreground app at the moment of capture (also used for the per-app ignore list). */
async function captureSource() {
  if (!prefs.sourceApp && !prefs.ignoredApps.length) return null;
  return sourceApp.current();
}

function attachSource(item, src) {
  if (prefs.sourceApp && src && src.name) {
    item.source_app = src.name;
    item.source_path = src.path;
  }
}

function storeCapturedItem(item, ownerUid) {
  if (!db.hasSession() || db.getUserId() !== ownerUid) return;
  const saved = db.insertItem(item);
  if (!saved) return;
  if (onNewItemCallback) onNewItemCallback(saved);
}

async function classifyCapturedItem(item, ownerUid) {
  try {
    const result = await focusClassifier.classify(item.content, prefs.focusTopics, prefs.focusCustomTopics);
    if (!db.hasSession() || db.getUserId() !== ownerUid) return;
    if (!result.relevant) {
      const queued = focusReview.add(item);
      if (queued) {
        if (onFocusReviewCallback) onFocusReviewCallback(queued);
        return;
      }
    }
  } catch (err) {
    console.warn('[focus] local classification failed; capturing normally:', err.message);
  }
  storeCapturedItem(item, ownerUid);
}

async function checkClipboard() {
  // Password managers flag their copies as "do not record" — respect that.
  if (prefs.guard && sensitive.excludedByApp(clipboard)) return;

  // Prefer image if present, else text
  const image = clipboard.readImage();
  if (!image.isEmpty()) {
    const dataUrl = image.toDataURL();
    const sig = 'img:' + hashContent(dataUrl.slice(0, 5000));
    if (sig === lastSignature) return;
    lastSignature = sig;
    // Nobody signed in: remember it as "seen" but store nothing. This also stops
    // a newly signed-in account from inheriting whatever was on the clipboard.
    if (!db.hasSession()) return;

    const src = await captureSource();
    if (sourceApp.isIgnored(src, prefs.ignoredApps)) return;

    const item = {
      id: crypto.randomUUID(),
      type: 'image',
      content: dataUrl,
      preview: 'Image',
      char_count: 0,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    attachSource(item, src);
    if (!db.insertItem(item)) return;
    if (onNewItemCallback) onNewItemCallback(item);
    return;
  }

  const text = clipboard.readText();
  if (!text || !text.trim()) return;

  const sig = 'text:' + hashContent(text);
  if (sig === lastSignature) return;
  lastSignature = sig;
  if (!db.hasSession()) return;
  const ownerUid = db.getUserId();

  if (db.isDuplicateOfLatest(text, detectType(text))) return;

  const src = await captureSource();
  if (!db.hasSession() || db.getUserId() !== ownerUid) return;
  if (sourceApp.isIgnored(src, prefs.ignoredApps)) return;

  const type = detectType(text);
  const item = {
    id: crypto.randomUUID(),
    type,
    content: text,
    preview: makePreview(type, text),
    char_count: text.length,
    created_at: Date.now(),
    updated_at: Date.now(),
  };
  attachSource(item, src);
  if (prefs.guard) sensitive.mark(item, prefs.secretTtl); // masks the preview + sets expires_at for secrets
  if (!item.sensitive && prefs.focusCapture && plan.limits().focusTopics > 0 && prefs.focusTopics.length && (type === 'text' || type === 'link' || type === 'code')) {
    // Do not await inference in the polling loop: polling stays responsive while
    // the captured snapshot is classified in the background.
    classifyCapturedItem(item, ownerUid);
    return;
  }
  storeCapturedItem(item, ownerUid);
}

async function tick() {
  if (busy) return;          // the source-app lookup is async; never overlap polls
  busy = true;
  try { await checkClipboard(); }
  catch (err) { console.error('[watcher] poll failed:', err); }
  finally { busy = false; }
}

function start(onNewItem, onFocusReview = null) {
  onNewItemCallback = onNewItem;
  onFocusReviewCallback = onFocusReview;
  // seed signature so app launch doesn't re-capture whatever is already on the clipboard
  const existingText = clipboard.readText();
  if (existingText) lastSignature = 'text:' + hashContent(existingText);
  intervalHandle = setInterval(tick, POLL_INTERVAL_MS);
}

function stop() {
  if (intervalHandle) clearInterval(intervalHandle);
}

function writeToClipboard(item) {
  if (item.type === 'image') {
    clipboard.writeImage(nativeImage.createFromDataURL(item.content));
  } else {
    clipboard.writeText(item.content);
  }
  // prevent the watcher from re-capturing our own write as a "new" item
  lastSignature = (item.type === 'image' ? 'img:' : 'text:') + hashContent(
    item.type === 'image' ? item.content.slice(0, 5000) : item.content
  );
}

/** After a secret expires: wipe it from the real clipboard too, but only if it's still there. */
function clearIfMatches(text) {
  try {
    if (clipboard.readText() === text) {
      clipboard.clear();
      lastSignature = null; // so copying the same secret again is captured normally
    }
  } catch { /* ignore */ }
}

module.exports = { start, stop, writeToClipboard, clearIfMatches, detectType };
