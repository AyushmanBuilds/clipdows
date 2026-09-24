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

function getItems({ type = 'all', search = '', limit = 200, trashed = false } = {}) {
  let items = data.items.filter(item => (trashed ? item.trashed === 1 : item.trashed === 0));
  if (type !== 'all') items = items.filter(item => item.type === type);
  if (search) {
    const searchTerm = search.toLowerCase();
    items = items.filter(item => String(item.content || '').toLowerCase().includes(searchTerm));
  }
  items.sort((a, b) => {
    if (b.pinned !== a.pinned) return b.pinned - a.pinned;
    return b.created_at - a.created_at;
  });
  return items.slice(0, limit);
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
      else if (action === 'pin') i.pinned = 1;
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
  insertItem,
  isDuplicateOfLatest,
  getItem,
  getItems,
  getTrashCount,
  getPinned,
  togglePin,
  trashItem,
  deleteItem,
  bulk,
  updateTags,
  updateContent,
  getSnippets,
  insertSnippet,
  deleteSnippet
};