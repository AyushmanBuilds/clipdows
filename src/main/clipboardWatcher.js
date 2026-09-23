const { clipboard, nativeImage } = require('electron');
const crypto = require('crypto');
const db = require('./db');

const POLL_INTERVAL_MS = 600;
const MAX_TEXT_PREVIEW = 140;

let lastSignature = null;
let intervalHandle = null;
let onNewItemCallback = null;

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

function checkClipboard() {
  // Prefer image if present, else text
  const image = clipboard.readImage();
  if (!image.isEmpty()) {
    const dataUrl = image.toDataURL();
    const sig = 'img:' + hashContent(dataUrl.slice(0, 5000));
    if (sig === lastSignature) return;
    lastSignature = sig;

    const item = {
      id: crypto.randomUUID(),
      type: 'image',
      content: dataUrl,
      preview: 'Image',
      char_count: 0,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    db.insertItem(item);
    if (onNewItemCallback) onNewItemCallback(item);
    return;
  }

  const text = clipboard.readText();
  if (!text || !text.trim()) return;

  const sig = 'text:' + hashContent(text);
  if (sig === lastSignature) return;
  lastSignature = sig;

  if (db.isDuplicateOfLatest(text, detectType(text))) return;

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
  db.insertItem(item);
  if (onNewItemCallback) onNewItemCallback(item);
}

function start(onNewItem) {
  onNewItemCallback = onNewItem;
  // seed signature so app launch doesn't re-capture whatever is already on the clipboard
  const existingText = clipboard.readText();
  if (existingText) lastSignature = 'text:' + hashContent(existingText);
  intervalHandle = setInterval(checkClipboard, POLL_INTERVAL_MS);
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

module.exports = { start, stop, writeToClipboard, detectType };
