const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Every signed-in account gets its OWN file: clipdows-data-<uid>.json.
// With nobody signed in there is no file and nothing is stored or returned.
const dataDir = app.getPath('userData');
let dbPath = null;
let currentUid = null;

let data = {
  items: [],
  snippets: []
};

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function loadData() {
  data = { items: [], snippets: [] };
  try {
    if (dbPath && fs.existsSync(dbPath)) {
      const raw = fs.readFileSync(dbPath, 'utf8');
      if (raw.trim()) {
        const parsed = JSON.parse(raw);
        data = {
          items: Array.isArray(parsed.items) ? parsed.items : [],
          snippets: Array.isArray(parsed.snippets) ? parsed.snippets : []
        };
      }
    }
  } catch (error) {
    console.error('ClipDows: Failed to load local data:', error);
    data = { items: [], snippets: [] };
  }
}

function saveData() {
  if (!dbPath) return;
  try {
    const tempPath = `${dbPath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, dbPath);
  } catch (error) {
    console.error('ClipDows: Failed to save local data:', error);
  }
}

/** Switch the active account (null = signed out). Loads that account's file, or starts empty. */
function setUser(uid) {
  const clean = uid ? String(uid).replace(/[^a-zA-Z0-9_-]/g, '') : null;
  if (clean === currentUid) return;
  currentUid = clean || null;
  dbPath = currentUid ? path.join(dataDir, `clipdows-data-${currentUid}.json`) : null;
  loadData();
}

function hasSession() {
  return !!currentUid;
}

function getUserId() { return currentUid; }

const flatPreview = (text) => {
  const flat = String(text || '').replace(/\s+/g, ' ').trim();
  return flat.length > 140 ? flat.slice(0, 140) + '…' : flat;
};

/** Pinning something means "keep it" — so it stops being masked / auto-expiring. */
function unmask(item) {
  if (!item.sensitive && !item.expires_at) return;
  item.sensitive = null; item.sensitive_label = null; item.expires_at = null;
  if (item.type !== 'image') item.preview = flatPreview(item.content);
}

function insertItem(item) {
  if (!dbPath) return null;
  const now = Date.now();
  const newItem = {
    id: item.id,
    type: item.type,
    content: item.content,
    preview: item.preview || '',
    pinned: 0,
    trashed: 0,
    tags: [],
    char_count: typeof item.char_count === 'number' ? item.char_count : String(item.content || '').length,
    created_at: item.created_at || now,
    updated_at: item.updated_at || now
  };
  // optional metadata (sensitive-data guard, source app)
  for (const k of ['sensitive', 'sensitive_label', 'expires_at', 'source_app', 'source_path', 'trigger']) {
    if (item[k] != null) newItem[k] = item[k];
  }
  data.items.push(newItem);
  saveData();
  return newItem;
}

function isDuplicateOfLatest(content, type) {
  const activeItems = data.items.filter(item => item.trashed === 0).sort((a, b) => b.created_at - a.created_at);
  const latest = activeItems[0];
  if (!latest) return false;
  return latest.content === content && latest.type === type;
}

function getItems({ type = 'all', search = '', limit = 200, trashed = false, historyCap = 0 } = {}) {
  let items = data.items.filter(item => (trashed ? item.trashed === 1 : item.trashed === 0));
  if (historyCap > 0 && !trashed) {
    // plan limit: only the newest N unpinned clips are visible; older ones stay stored (locked) until you upgrade.
    // Pinned items and snippets are never counted or hidden.
    const allowed = new Set(items.filter(i => i.pinned !== 1 && i.type !== 'snippet')
      .sort((a, b) => b.created_at - a.created_at).slice(0, historyCap).map(i => i.id));
    items = items.filter(i => i.pinned === 1 || i.type === 'snippet' || allowed.has(i.id));
  }
  if (type !== 'all') items = items.filter(item => item.type === type);
  if (search) {
    // "app:code invoice" -> only clips copied from an app matching "code", containing "invoice"
    let searchTerm = search.toLowerCase();
    let appFilter = '';
    const m = searchTerm.match(/^app:(\S*)\s*(.*)$/);
    if (m) { appFilter = m[1]; searchTerm = m[2]; }
    items = items.filter(item => {
      if (appFilter && !String(item.source_app || '').toLowerCase().includes(appFilter)) return false;
      if (!searchTerm) return true;
      if (item.sensitive) return false; // secrets never show up in search results
      const body = item.type === 'image' ? item.ocr_text : item.content; // images: search the OCR text
      return (String(body || '') + ' ' + String(item.source_app || '')).toLowerCase().includes(searchTerm);
    });
  }
  items.sort((a, b) => {
    if (b.pinned !== a.pinned) return b.pinned - a.pinned;
    return b.created_at - a.created_at;
  });
  return items.slice(0, limit);
}

/** Active, unpinned, non-snippet clips (what the history limit counts). */
function countUnpinned() {
  return data.items.filter(i => i.trashed === 0 && i.pinned !== 1 && i.type !== 'snippet').length;
}

/** Keeps storage bounded: drops the oldest unpinned clips beyond `keep` (callers pass ~3x the plan limit). */
function enforceRetention(keep) {
  if (!(keep > 0)) return 0;
  const un = data.items.filter(i => i.trashed === 0 && i.pinned !== 1 && i.type !== 'snippet').sort((a, b) => b.created_at - a.created_at);
  if (un.length <= keep) return 0;
  const drop = new Set(un.slice(keep).map(i => i.id));
  data.items = data.items.filter(i => !drop.has(i.id));
  saveData();
  return drop.size;
}

function getTrashCount() {
  return data.items.filter(item => item.trashed === 1).length;
}

function getItem(id) {
  return data.items.find(item => item.id === id) || null;
}

function getPinned() {
  return data.items
    .filter(item => item.pinned === 1 && item.trashed === 0)
    .sort((a, b) => b.created_at - a.created_at);
}

function togglePin(id) {
  const item = data.items.find(item => item.id === id);
  if (!item) return false;
  item.pinned = item.pinned === 1 ? 0 : 1;
  if (item.pinned === 1) unmask(item);
  item.updated_at = Date.now();
  saveData();
  return true;
}

function trashItem(id) {
  const item = data.items.find(item => item.id === id);
  if (!item) return false;
  item.trashed = 1;
  item.updated_at = Date.now();
  saveData();
  return true;
}

function deleteItem(id) {
  const originalLength = data.items.length;
  data.items = data.items.filter(item => item.id !== id);
  const deleted = data.items.length !== originalLength;
  if (deleted) saveData();
  return deleted;
}

/**
 * Multi-item actions used by the dashboard.
 * action: 'trash' | 'restore' | 'delete' (forever) | 'pin' | 'unpin' | 'emptyTrash' | 'clearUnpinned'
 * Returns how many items were affected.
 */
function bulk(action, ids = []) {
  const set = new Set(ids);
  const now = Date.now();
  let n = 0;
  if (action === 'emptyTrash') {
    const before = data.items.length;
    data.items = data.items.filter(i => i.trashed !== 1);
    n = before - data.items.length;
  } else if (action === 'delete') {
    const before = data.items.length;
    data.items = data.items.filter(i => !set.has(i.id));
    n = before - data.items.length;
  } else {
    data.items.forEach(i => {
      const hit = action === 'clearUnpinned' ? (i.trashed === 0 && i.pinned !== 1) : set.has(i.id);
      if (!hit) return;
      if (action === 'trash' || action === 'clearUnpinned') i.trashed = 1;
      else if (action === 'restore') i.trashed = 0;
      else if (action === 'pin') { i.pinned = 1; unmask(i); }
      else if (action === 'unpin') i.pinned = 0;
      else return;
      i.updated_at = now;
      n++;
    });
  }
  if (n) saveData();
  return n;
}

function updateTags(id, tags) {
  const item = data.items.find(item => item.id === id);
  if (!item) return false;
  item.tags = Array.isArray(tags) ? tags : [];
  item.updated_at = Date.now();
  saveData();
  return true;
}

/**
 * Update an item's own content (used by the "Edit" action in the detail panel).
 * Regenerates preview/char_count to stay consistent with what the clipboard watcher writes.
 */
function updateContent(id, content) {
  const item = data.items.find(item => item.id === id);
  if (!item) return false;
  const text = String(content ?? '');
  item.content = text;
  item.char_count = text.length;
  if (item.type !== 'image') {
    const flat = text.replace(/\s+/g, ' ').trim();
    item.preview = flat.length > 140 ? flat.slice(0, 140) + '…' : flat;
  }
  item.updated_at = Date.now();
  saveData();
  return item;
}

/** Deletes secrets whose time is up. Returns the removed items (so the caller can wipe the OS clipboard too). */
function purgeExpired() {
  const now = Date.now();
  const gone = data.items.filter(i => i.expires_at && i.expires_at <= now);
  if (!gone.length) return [];
  data.items = data.items.filter(i => !(i.expires_at && i.expires_at <= now));
  saveData();
  return gone;
}

/** Stores text found inside an image clip (empty string = scanned, nothing found). */
function setOcrText(id, text) {
  const item = data.items.find(i => i.id === id);
  if (!item) return false;
  item.ocr_text = String(text || '');
  item.ocr_done = true;
  saveData();
  return true;
}

function getSnippets() {
  return [...data.snippets].sort((a, b) => b.created_at - a.created_at);
}

function insertSnippet(snippet) {
  if (!dbPath) return null;
  const newSnippet = {
    id: snippet.id,
    title: snippet.title,
    content: snippet.content,
    folder: snippet.folder || 'General',
    trigger: snippet.trigger || '',
    created_at: snippet.created_at || Date.now()
  };
  data.snippets.push(newSnippet);
  saveData();
  return newSnippet;
}

function deleteSnippet(id) {
  const originalLength = data.snippets.length;
  data.snippets = data.snippets.filter(snippet => snippet.id !== id);
  const deleted = data.snippets.length !== originalLength;
  if (deleted) saveData();
  return deleted;
}

const db = {
  get path() { return dbPath; },
  reload() { loadData(); },
  save() { saveData(); }
};

module.exports = {
  db,
  setUser,
  hasSession,
  getUserId,
  insertItem,
  isDuplicateOfLatest,
  getItem,
  getItems,
  countUnpinned,
  enforceRetention,
  getTrashCount,
  getPinned,
  togglePin,
  trashItem,
  deleteItem,
  bulk,
  updateTags,
  updateContent,
  purgeExpired,
  setOcrText,
  getSnippets,
  insertSnippet,
  deleteSnippet
};
