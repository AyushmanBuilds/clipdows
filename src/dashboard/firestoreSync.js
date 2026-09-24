// firestoreSync.js — device pairing (QR code) + real-time clipboard sync
// between this desktop app and a paired phone, via Firestore.
//
// Desktop -> phone: automatic (main.js emits `cloud:push` the instant
// clipboardWatcher.js sees something new; we write it to Firestore).
// Phone -> desktop: automatic too. The phone captures what you copied when
// ClipDows opens (or via Share / the send box) and it lands here through the
// onSnapshot listener below.
//
// Privacy: everything lives under users/{uid}/..., and the "already imported"
// list is stored PER ACCOUNT, so two accounts on one PC never share state.
//
// Duplicate protection (this is what fixes "shows twice"):
//  1. ECHO GUARD  - when a phone item is written to this PC's clipboard, the
//     clipboard watcher sees it as a "new copy" and used to upload it again.
//     We now remember what we just received and refuse to re-upload it.
//  2. ONE PUSH HANDLER - onCloudPush is registered once, not on every
//     startClipSync(), so re-login can't multiply uploads.
//  3. SEEN IDS - every cloud item is imported once per account (persisted), so
//     app restarts and phone-side deletes (which slide older docs back into the
//     25-item window) can't re-import old clips.

import { app, auth } from './firebase-auth.js';
import {
  getFirestore, doc, getDoc, getDocs, setDoc, onSnapshot, collection, addDoc,
  query, orderBy, limit, serverTimestamp, deleteDoc,
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

const db = getFirestore(app);
const PAIR_TTL_MS = 5 * 60 * 1000; // pairing codes expire after 5 minutes
const PWA_URL = 'https://clipdows-c20d5.web.app'; // update after `firebase deploy` for the /pwa app
const SEEN_PREFIX = 'clipdows.seenCloudIds.';
const ECHO_WINDOW_MS = 30 * 1000;

let currentUid = null;
let unsubItems = null;
let unsubPairing = null;
let pushHandlerRegistered = false;
let sourceTag = 'desktop:' + (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2));

const cid = () => globalThis.crypto?.randomUUID?.() || (Date.now() + '-' + Math.random());
const norm = (s) => String(s ?? '').replace(/\r\n/g, '\n').trim();

// ---------- seen ids (persisted per account) ----------
const seen = new Set();
let baselineNeeded = true; // first run for THIS account: mark existing cloud items as seen instead of re-importing them
function loadSeen(uid) {
  seen.clear();
  baselineNeeded = true;
  try {
    const raw = localStorage.getItem(SEEN_PREFIX + uid);
    if (raw !== null) { JSON.parse(raw).forEach((id) => seen.add(id)); baselineNeeded = false; }
  } catch { /* ignore */ }
}
function saveSeen() {
  if (!currentUid) return;
  try { localStorage.setItem(SEEN_PREFIX + currentUid, JSON.stringify([...seen].slice(-600))); } catch { /* ignore */ }
}

// ---------- echo guard ----------
const receivedFromPhone = new Map(); // normalized text -> timestamp
let lastPhoneImageAt = 0;
let lastPush = { key: '', at: 0 };
function rememberReceived(data) {
  if (data.type === 'image') lastPhoneImageAt = Date.now();
  else receivedFromPhone.set(norm(data.content), Date.now());
}
function isEcho(item) {
  const now = Date.now();
  for (const [k, t] of receivedFromPhone) if (now - t > ECHO_WINDOW_MS) receivedFromPhone.delete(k);
  if (item.type === 'image') return now - lastPhoneImageAt < 8000; // clipboard re-encodes images, so match by timing
  return receivedFromPhone.has(norm(item.content));
}

function randomCode() {
  // 6 chars, no ambiguous glyphs (0/O, 1/I) — read out loud easily if needed.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

function registerPushHandler() {
  if (pushHandlerRegistered) return;
  pushHandlerRegistered = true;
  // Desktop -> Firestore: push every locally captured item (registered ONCE).
  window.clipdows.onCloudPush(async (item) => {
    if (!currentUid) return;
    if (isEcho(item)) return; // this "copy" was just delivered from the phone
    const key = item.type + '|' + (item.type === 'image' ? String(item.content || '').length : norm(item.content));
    const now = Date.now();
    if (key === lastPush.key && now - lastPush.at < 3000) return; // watcher fired twice for one copy
    lastPush = { key, at: now };
    try {
      await addDoc(collection(db, 'users', currentUid, 'clipboard_items'), {
        type: item.type,
        content: item.content,
        preview: item.preview,
        char_count: item.char_count,
        created_at: item.created_at || now,
        source: sourceTag,
        client_id: cid(),
        serverAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('[firestoreSync] failed to push item to cloud:', err);
    }
  });
}

/** Call once after sign-in (from dashboard.js's auth-state listener). */
export function startClipSync(uid) {
  if (currentUid === uid) return;
  stopClipSync();
  currentUid = uid;
  loadSeen(uid);            // this account's own "already imported" list
  receivedFromPhone.clear();
  lastPush = { key: '', at: 0 };
  registerPushHandler();

  // Firestore -> desktop: anything a paired phone sends lands here in real time.
  const itemsQuery = query(
    collection(db, 'users', uid, 'clipboard_items'),
    orderBy('serverAt', 'desc'),
    limit(25)
  );
  unsubItems = onSnapshot(itemsQuery, (snap) => {
    if (currentUid !== uid) return; // account changed while this snapshot was in flight
    const baseline = baselineNeeded;
    baselineNeeded = false;
    snap.docChanges().forEach((change) => {
      const id = change.doc.id;

      if (change.type === 'removed') {
        // 'removed' also fires when a doc merely slides out of the 25-item window,
        // so confirm it was really deleted before telling the app.
        getDoc(change.doc.ref).then((s) => {
          if (!s.exists()) {
            seen.delete(id); saveSeen();
            if (window.clipdows.removeCloudItem) window.clipdows.removeCloudItem(id);
          }
        }).catch(() => {});
        return;
      }
      if (change.type !== 'added') return;
      if (seen.has(id)) return;          // already imported once
      seen.add(id);
      if (baseline) return;              // first run for this account: don't re-import history

      const data = change.doc.data();
      if (data.source === sourceTag) return;                              // our own write
      if (data.source && data.source.startsWith('desktop:')) return;      // another desktop, not a phone

      rememberReceived(data); // BEFORE handing it to the app, which may write it to the clipboard
      window.clipdows.reportCloudItem({
        id,
        type: data.type,
        content: data.content,
        preview: data.preview,
        char_count: data.char_count,
        created_at: data.created_at || Date.now(),
      });
    });
    saveSeen();
  }, (err) => console.error('[firestoreSync] items listener error:', err));
}

export function stopClipSync() {
  if (unsubItems) unsubItems();
  unsubItems = null;
  cancelPairing();
  currentUid = null;
}

/**
 * Opens a pairing session: writes a short-lived code to Firestore, resolves
 * with { code, url, qrDataUrl }, and calls onLinked(deviceInfo) the moment a
 * phone scans it and claims the code. Caller is responsible for rendering
 * the QR into the modal and for calling cancelPairing() on modal close.
 */
export async function beginPairing(onLinked) {
  if (!currentUid) throw new Error('Not signed in yet.');
  cancelPairing();
  const ownerUid = currentUid;
  const code = randomCode();
  const pairingRef = doc(db, 'pairings', code);
  await setDoc(pairingRef, {
    ownerUid,
    status: 'pending',
    createdAt: Date.now(),
    expiresAt: Date.now() + PAIR_TTL_MS,
  });

  const url = `${PWA_URL}/pair.html?code=${code}`;
  const qrDataUrl = await window.QRCode.toDataURL(url, { width: 260, margin: 1 });

  let handled = false;
  unsubPairing = onSnapshot(pairingRef, async (snap) => {
    const data = snap.data();
    if (handled || !data || data.status !== 'claimed' || !data.phoneUid) return;
    handled = true;

    // Grant that phone's Firestore-auth uid read/write access to this
    // account's clipboard_items (security rules check this list — see
    // firestore.rules). Device metadata lives alongside it for the
    // "Your Devices" list.
    await setDoc(doc(db, 'users', ownerUid, 'linkedDevices', data.phoneUid), {
      name: data.deviceName || 'Android phone',
      linkedAt: Date.now(),
      lastSeen: Date.now(),
    });
    await deleteDoc(pairingRef).catch(() => {});
    cancelPairing();
    onLinked({ uid: data.phoneUid, name: data.deviceName || 'Android phone' });
  });

  // Auto-expire the listener/UI even if nothing ever scans it.
  setTimeout(() => { if (unsubPairing) cancelPairing(); }, PAIR_TTL_MS);

  return { code, url, qrDataUrl };
}

export function cancelPairing() {
  if (unsubPairing) unsubPairing();
  unsubPairing = null;
}

/** Phones linked to the signed-in account (newest first). */
export async function listDevices() {
  if (!currentUid) return [];
  const snap = await getDocs(collection(db, 'users', currentUid, 'linkedDevices'));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() })).sort((a, b) => (b.linkedAt || 0) - (a.linkedAt || 0));
}

/** Removes a phone's access to this account's clipboard. */
export async function revokeDevice(phoneUid) {
  if (!currentUid) throw new Error('Not signed in yet.');
  await deleteDoc(doc(db, 'users', currentUid, 'linkedDevices', phoneUid));
}

// dashboard.js is a plain (non-module) script, so expose everything it needs
// on window rather than making it deal with ESM imports.
window.clipSync = { startClipSync, stopClipSync, beginPairing, cancelPairing, listDevices, revokeDevice };