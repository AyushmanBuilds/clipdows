const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const REVIEW_MS = 48 * 60 * 60 * 1000;
const REMIND_AFTER_MS = 24 * 60 * 60 * 1000;
const TOMBSTONE_MS = 30 * 24 * 60 * 60 * 1000;
let uid = null;
let rows = [];
let tombstones = new Map();

function filePath() {
  return uid ? path.join(app.getPath('userData'), `focus-review-${uid}.json`) : null;
}

function save() {
  const file = filePath();
  if (!file) return;
  const temp = `${file}.tmp`;
  try { fs.writeFileSync(temp, JSON.stringify({ version: 2, rows, tombstones: [...tombstones] }), 'utf8'); fs.renameSync(temp, file); }
  catch (err) { try { fs.rmSync(temp, { force: true }); } catch {} console.warn('[focus] could not save review queue:', err.message); }
}

function purgeExpired(now = Date.now()) {
  const before = rows.length;
  rows = rows.filter((row) => {
    if (Number(row.expires_at) > now) return true;
    tombstones.set(String(row.id), now);
    return false;
  });
  if (rows.length !== before) save();
  return before - rows.length;
}

function setUser(newUid) {
  uid = newUid ? String(newUid).replace(/[^a-zA-Z0-9_-]/g, '') : null;
  rows = [];
  tombstones = new Map();
  const file = filePath();
  if (!file) return;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    const parsedRows = Array.isArray(parsed) ? parsed : parsed?.rows;
    rows = Array.isArray(parsedRows) ? parsedRows.filter((row) => row && typeof row.id === 'string' && typeof row.content === 'string') : [];
    if (Array.isArray(parsed?.tombstones)) tombstones = new Map(parsed.tombstones.filter((entry) => Array.isArray(entry) && typeof entry[0] === 'string').map(([id, at]) => [id, Number(at) || Date.now()]));
  } catch { rows = []; }
  purgeExpired();
}

function add(item) {
  if (!uid || !item || !['text', 'link', 'code'].includes(item.type)) return null;
  const now = Date.now();
  const existing = rows.find((row) => row.type === item.type && row.content === item.content);
  if (existing) {
    existing.reviewed_at = now;
    existing.expires_at = now + REVIEW_MS;
    existing.reminded_at = 0;
    existing.updated_at = now;
    tombstones.delete(String(existing.id));
    save();
    return existing;
  }
  const row = {
    id: item.id,
    type: item.type,
    content: item.content,
    preview: item.preview,
    char_count: item.char_count,
    created_at: item.created_at || now,
    reviewed_at: now,
    expires_at: now + REVIEW_MS,
    reminded_at: 0,
    updated_at: now,
    source_app: item.source_app || null,
    source_path: item.source_path || null,
  };
  rows.unshift(row);
  save();
  return row;
}

function list() {
  purgeExpired();
  return rows.slice().sort((a, b) => b.reviewed_at - a.reviewed_at);
}

function get(id) { purgeExpired(); return rows.find((row) => row.id === id) || null; }

function remove(id) {
  id = String(id);
  const before = rows.length;
  rows = rows.filter((row) => row.id !== id);
  if (rows.length !== before) {
    tombstones.set(id, Date.now());
    save();
  }
  return rows.length !== before;
}

// Cloud copies are encrypted by firestoreSync.js. Tombstones let another
// signed-in Windows install learn about removals even if it was offline then.
function exportSyncState() {
  purgeExpired();
  const cutoff = Date.now() - TOMBSTONE_MS;
  for (const [id, at] of tombstones) if (at < cutoff) tombstones.delete(id);
  save();
  return { rows: rows.map((row) => ({ ...row })), tombstones: [...tombstones].map(([id, deleted_at]) => ({ id, deleted_at })) };
}

function mergeSyncState(remote = {}) {
  const now = Date.now();
  let changed = false;
  for (const mark of Array.isArray(remote.tombstones) ? remote.tombstones : []) {
    if (!mark || typeof mark.id !== 'string') continue;
    const at = Number(mark.deleted_at) || 0;
    const local = rows.find((row) => row.id === mark.id);
    if (local && at < (Number(local.updated_at) || Number(local.reviewed_at) || 0)) {
      if (tombstones.delete(mark.id)) changed = true;
      continue;
    }
    if (!tombstones.has(mark.id) || tombstones.get(mark.id) < at) { tombstones.set(mark.id, at); changed = true; }
    if (local && at >= (Number(local.updated_at) || Number(local.reviewed_at) || 0)) {
      rows = rows.filter((row) => row.id !== mark.id);
      changed = true;
    }
  }
  for (const candidate of Array.isArray(remote.rows) ? remote.rows : []) {
    if (!candidate || typeof candidate.id !== 'string' || typeof candidate.content !== 'string' || Number(candidate.expires_at) <= now) continue;
    const markAt = tombstones.get(candidate.id) || 0;
    const candidateAt = Number(candidate.updated_at) || Number(candidate.reviewed_at) || 0;
    if (markAt >= candidateAt) continue;
    const index = rows.findIndex((row) => row.id === candidate.id);
    if (index >= 0) {
      const localAt = Number(rows[index].updated_at) || Number(rows[index].reviewed_at) || 0;
      if (localAt >= candidateAt) continue;
      rows[index] = candidate;
    } else rows.push(candidate);
    tombstones.delete(candidate.id);
    changed = true;
  }
  if (changed) { rows.sort((a, b) => b.reviewed_at - a.reviewed_at); save(); }
  return { ...exportSyncState(), changed };
}

function sweep(now = Date.now()) {
  const expiredCount = purgeExpired(now);
  const due = rows.filter((row) => !row.reminded_at && now - row.reviewed_at >= REMIND_AFTER_MS);
  if (due.length) {
    for (const row of due) { row.reminded_at = now; row.updated_at = now; }
    save();
  }
  const earliestExpiryMs = due.length ? Math.max(0, Math.min(...due.map((row) => row.expires_at)) - now) : 0;
  return { count: rows.length, reminderCount: due.length, expiredCount, earliestExpiryMs };
}

module.exports = { add, get, list, remove, setUser, sweep, exportSyncState, mergeSyncState, REVIEW_MS, REMIND_AFTER_MS };
