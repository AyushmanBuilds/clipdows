const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const dataDir = app.getPath('userData');
const dbPath = path.join(dataDir, 'clipdows-data.json');

let data = {
  items: [],
  snippets: []
};

// Make sure the ClipDows data directory exists.
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Load existing data.
function loadData() {
  try {
    if (fs.existsSync(dbPath)) {
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

    data = {
      items: [],
      snippets: []
    };
  }
}

// Save data synchronously so clipboard operations remain predictable.
function saveData() {
  try {
    const tempPath = `${dbPath}.tmp`;

    fs.writeFileSync(
      tempPath,
      JSON.stringify(data, null, 2),
      'utf8'
    );

    fs.renameSync(tempPath, dbPath);
  } catch (error) {
    console.error('ClipDows: Failed to save local data:', error);
  }
}

loadData();

/**
 * Insert a clipboard item.
 */
function insertItem(item) {
  const now = Date.now();

  const newItem = {
    id: item.id,
    type: item.type,
    content: item.content,
    preview: item.preview || '',
    pinned: 0,
    trashed: 0,
    tags: [],
    char_count:
      typeof item.char_count === 'number'
        ? item.char_count
        : String(item.content || '').length,
    created_at: item.created_at || now,
    updated_at: item.updated_at || now
  };

  data.items.push(newItem);

  saveData();

  return newItem;
}

/**
 * Check whether the newest active item
 * has identical content and type.
 */
function isDuplicateOfLatest(content, type) {
  const activeItems = data.items
    .filter(item => item.trashed === 0)
    .sort((a, b) => b.created_at - a.created_at);

  const latest = activeItems[0];

  if (!latest) {
    return false;
  }

  return (
    latest.content === content &&
    latest.type === type
  );
}

/**
 * Get clipboard items.
 */
function getItems({
  type = 'all',
  search = '',
  limit = 200
} = {}) {
  let items = data.items.filter(item => item.trashed === 0);

  if (type !== 'all') {
    items = items.filter(item => item.type === type);
  }

  if (search) {
    const searchTerm = search.toLowerCase();

    items = items.filter(item =>
      String(item.content || '')
        .toLowerCase()
        .includes(searchTerm)
    );
  }

  items.sort((a, b) => {
    if (b.pinned !== a.pinned) {
      return b.pinned - a.pinned;
    }

    return b.created_at - a.created_at;
  });

  return items.slice(0, limit);
}

/**
 * Get a single item by id.
 */
function getItem(id) {
  return data.items.find(item => item.id === id) || null;
}

/**
 * Get pinned clipboard items.
 */
function getPinned() {
  return data.items
    .filter(
      item =>
        item.pinned === 1 &&
        item.trashed === 0
    )
    .sort(
      (a, b) =>
        b.created_at - a.created_at
    );
}

/**
 * Toggle pinned state.
 */
function togglePin(id) {
  const item = data.items.find(
    item => item.id === id
  );

  if (!item) {
    return false;
  }

  item.pinned = item.pinned === 1 ? 0 : 1;
  item.updated_at = Date.now();

  saveData();

  return true;
}

/**
 * Move item to Trash.
 */
function trashItem(id) {
  const item = data.items.find(
    item => item.id === id
  );

  if (!item) {
    return false;
  }

  item.trashed = 1;
  item.updated_at = Date.now();

  saveData();

  return true;
}

/**
 * Permanently delete item.
 */
function deleteItem(id) {
  const originalLength = data.items.length;

  data.items = data.items.filter(
    item => item.id !== id
  );

  const deleted =
    data.items.length !== originalLength;

  if (deleted) {
    saveData();
  }

  return deleted;
}

/**
 * Update item tags.
 */
function updateTags(id, tags) {
  const item = data.items.find(
    item => item.id === id
  );

  if (!item) {
    return false;
  }

  item.tags = Array.isArray(tags)
    ? tags
    : [];

  item.updated_at = Date.now();

  saveData();

  return true;
}

/**
 * Get all snippets.
 */
function getSnippets() {
  return [...data.snippets].sort(
    (a, b) =>
      b.created_at - a.created_at
  );
}

/**
 * Insert a snippet.
 */
function insertSnippet(snippet) {
  const newSnippet = {
    id: snippet.id,
    title: snippet.title,
    content: snippet.content,
    folder: snippet.folder || 'General',
    created_at:
      snippet.created_at || Date.now()
  };

  data.snippets.push(newSnippet);

  saveData();

  return newSnippet;
}

/**
 * Delete a snippet.
 */
function deleteSnippet(id) {
  const originalLength =
    data.snippets.length;

  data.snippets = data.snippets.filter(
    snippet => snippet.id !== id
  );

  const deleted =
    data.snippets.length !== originalLength;

  if (deleted) {
    saveData();
  }

  return deleted;
}

/**
 * Export a small compatibility object.
 *
 * The old version exported a SQLite `db`.
 * We don't need SQLite anymore, but keeping
 * this object prevents unnecessary crashes
 * if another file checks for `db`.
 */
const db = {
  get path() {
    return dbPath;
  },

  reload() {
    loadData();
  },

  save() {
    saveData();
  }
};

module.exports = {
  db,
  insertItem,
  isDuplicateOfLatest,
  getItem,
  getItems,
  getPinned,
  togglePin,
  trashItem,
  deleteItem,
  updateTags,
  getSnippets,
  insertSnippet,
  deleteSnippet
};