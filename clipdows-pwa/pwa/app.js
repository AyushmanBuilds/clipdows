// app.js — shared logic for the ClipDows companion PWA (index.html + pair.html).
//
// Auth model: the phone never signs into the owner's account. Instead it
// signs in anonymously (its own throwaway uid), and pairing writes that
// phoneUid into /users/{ownerUid}/linkedDevices/{phoneUid}. Firestore
// security rules (see /firestore.rules) grant a linked phoneUid read/write
// access to just that one owner's clipboard_items collection. Everything
// this file does after pairing operates "as" that phone uid, scoped to the
// paired ownerUid.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDoc, setDoc, updateDoc, deleteDoc, deleteField,
  collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp, getDocs, writeBatch,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import {
  getMessaging, isSupported as isMessagingSupported, getToken, deleteToken, onMessage,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging.js";

// Same public web config as firebase-auth.js (Firebase web config is not a secret).
const firebaseConfig = {
  apiKey: "AIzaSyCM-ay_5E70skMszLlYziZgafrkQ25SWS8",
  authDomain: "clipdows-c20d5.firebaseapp.com",
  projectId: "clipdows-c20d5",
  storageBucket: "clipdows-c20d5.firebasestorage.app",
  messagingSenderId: "229362038617",
  appId: "1:229362038617:web:9145117fe7b3a610227e48",
};

let app, auth, db, initError = null;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  try { db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }); }
  catch { db = getFirestore(app); }
} catch (err) {
  initError = err;
  console.error("[ClipDows] Firebase failed to initialize:", err);
}

const PAIRING_KEY = "clipdows.pairing"; // { ownerUid, phoneUid, deviceName }
const MAX_INLINE_IMAGE_BYTES = 640 * 1024; // encrypted + base64 payloads grow ~1.35x, so this keeps docs under the 1MiB Firestore limit
const MAX_PAYLOAD_CHARS = 900000;

// ---------- Push notifications (FCM) ----------
// Generate this in the Firebase Console: Project settings → Cloud Messaging →
// "Web Push certificates" → Generate key pair. Paste the key here. Until you
// do, pushSupported() reports false and the Settings toggle stays hidden.
const VAPID_KEY = "BNfGa_zxRLoq2Lnu6CEOHCttAhQNp11XRPZJjSw2r4RERUUrXmG32bOzXzR-htahDfc3ODmqEjr2NPfZoRFlVug";
const PUSH_TOKEN_KEY = "clipdows.pushToken";

let messagingInstance = null, messagingChecked = false;
async function ensureMessaging() {
  if (messagingChecked) return messagingInstance;
  messagingChecked = true;
  try {
    if (!(await isMessagingSupported())) return null;
    messagingInstance = getMessaging(app);
  } catch { messagingInstance = null; }
  return messagingInstance;
}

/** True once the browser can support Web Push AND a real VAPID key has been configured above. */
function pushSupported() {
  return !!(window.Notification && navigator.serviceWorker && VAPID_KEY && !VAPID_KEY.startsWith("REPLACE_WITH"));
}

function pushPermission() {
  return window.Notification ? Notification.permission : "unsupported";
}

/** Requests permission, grabs an FCM token, and saves it onto this phone's linkedDevices doc so the Cloud Function can reach it. */
async function enablePush() {
  if (!pushSupported()) throw new Error("Push notifications aren\u2019t set up for this app yet.");
  const pairing = getPairing();
  if (!pairing) throw new Error("Not paired yet.");
  if (isIos() && !isStandalone()) throw new Error("On iPhone, install ClipDows to your Home Screen first \u2014 Safari tabs can\u2019t receive push notifications.");

  const perm = await Notification.requestPermission();
  if (perm !== "granted") {
    throw new Error(perm === "denied" ? "Notifications are blocked for ClipDows in your browser\u2019s site settings." : "Permission wasn\u2019t granted.");
  }
  const m = await ensureMessaging();
  if (!m) throw new Error("This browser doesn\u2019t support push messaging.");

  const reg = await navigator.serviceWorker.ready;
  const token = await getToken(m, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
  if (!token) throw new Error("Couldn\u2019t get a notification token. Try again.");

  await setDoc(doc(db, "users", pairing.ownerUid, "linkedDevices", pairing.phoneUid), {
    fcmToken: token,
    deviceName: pairing.deviceName,
    platform: navigator.userAgent,
    tokenUpdatedAt: Date.now(),
  }, { merge: true });

  localStorage.setItem(PUSH_TOKEN_KEY, token);
  return token;
}

/** Revokes the token locally and clears it from the linkedDevices doc so the Cloud Function stops targeting this phone. */
async function disablePush() {
  const pairing = getPairing();
  try {
    const m = await ensureMessaging();
    if (m) await deleteToken(m).catch(() => {});
  } finally {
    localStorage.removeItem(PUSH_TOKEN_KEY);
    if (pairing) {
      try { await updateDoc(doc(db, "users", pairing.ownerUid, "linkedDevices", pairing.phoneUid), { fcmToken: deleteField() }); }
      catch { /* best effort */ }
    }
  }
}

function isPushEnabled() {
  return pushPermission() === "granted" && !!localStorage.getItem(PUSH_TOKEN_KEY);
}

/** Fires cb(payload) for pushes that arrive while the app is open and focused (background ones are handled in service-worker.js). */
function onForegroundPush(cb) {
  ensureMessaging().then((m) => { if (m) onMessage(m, cb); });
}

function getPairing() {
  try { return JSON.parse(localStorage.getItem(PAIRING_KEY) || "null"); } catch { return null; }
}
function setPairing(p) { localStorage.setItem(PAIRING_KEY, JSON.stringify(p)); window.dispatchEvent(new CustomEvent('clipdows:pairingChanged', { detail: p })); }
function clearPairing() {
  const p = getPairing();
  localStorage.removeItem(PAIRING_KEY);
  localStorage.removeItem(PLAN_KEY);
  planDoc = null;
  if (p) clearStoredKey(p.ownerUid).catch(() => {});
  cryptoKey = null; cryptoMeta = undefined;
  emitCryptoState('none');
  window.dispatchEvent(new CustomEvent('clipdows:pairingChanged', { detail: null }));
}

/** Ensures we have an anonymous Firebase auth session; resolves with the uid. */
function ensureAnonAuth() {
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) { unsub(); resolve(user.uid); return; }
      signInAnonymously(auth).catch(reject);
    }, reject);
  });
}

/**
 * Claims a 6-character pairing code generated by the desktop app's
 * "Add Device" QR flow. Writes this phone's uid + a device name into the
 * pairing doc; firestoreSync.js on desktop is listening for that and will
 * finish the handshake by writing linkedDevices/{phoneUid}.
 */
async function claimPairingCode(code, deviceName) {
  const phoneUid = await ensureAnonAuth();
  const cleanCode = String(code || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(cleanCode)) throw new Error("Enter the 6-character code shown on your PC.");

  const pairingRef = doc(db, "pairings", cleanCode);
  const snap = await getDoc(pairingRef);
  if (!snap.exists()) throw new Error("That code has expired or is incorrect. Generate a new one from ClipDows on your PC.");
  const data = snap.data();
  if (data.status !== "pending") throw new Error("That code was already used. Generate a new one.");
  if (data.expiresAt && Date.now() > data.expiresAt) throw new Error("That code expired. Generate a new one.");

  await updateDoc(pairingRef, {
    status: "claimed",
    phoneUid,
    deviceName: deviceName || "Android phone",
  });

  const pairing = { ownerUid: data.ownerUid, phoneUid, deviceName: deviceName || "Android phone" };
  setPairing(pairing);
  return pairing;
}


// ---------- Plan (mirrors the Windows app's plan.js — same tiers, same limits) ----------
// The PC publishes its plan to users/{owner}/meta/plan; the phone only ever READS it.
// Plans can only be bought in the Windows app.
const LIMITS = {
  free: { history: 100, pinned: 5, snippets: 10, phones: 1, syncItems: 25, syncImages: false, stack: 5, ocrPerMonth: 5,
          appFilter: false, export: false, customExpiry: false, actions: "basic", variables: false, triggers: false, timeMachine: false },
  pro:  { history: 1000, pinned: -1, snippets: 100, phones: 3, syncItems: 200, syncImages: true, stack: -1, ocrPerMonth: -1,
          appFilter: true, export: true, customExpiry: true, actions: "full", variables: false, triggers: false, timeMachine: false },
  max:  { history: -1, pinned: -1, snippets: -1, phones: 10, syncItems: 1000, syncImages: true, stack: -1, ocrPerMonth: -1,
          appFilter: true, export: true, customExpiry: true, actions: "full", variables: true, triggers: true, timeMachine: true },
};
const PLAN_KEY = "clipdows.plan";
const DAY_MS = 86400000;
let planDoc = null;
try { planDoc = JSON.parse(localStorage.getItem(PLAN_KEY) || "null"); } catch { planDoc = null; }

/** Resolves the effective plan from the last document the PC published (re-evaluated live, so expiry works even if the PC is off). */
function getPlan() {
  const now = Date.now(), p = planDoc || {};
  let tier = "free", paid = false, trial = false;
  if (p.dev && LIMITS[p.devTier]) tier = p.devTier;
  else if (LIMITS[p.paidTier] && (p.paidUntil || 0) > now) { tier = p.paidTier; paid = true; }
  else if ((p.trialEndsAt || 0) > now) { tier = "pro"; trial = true; }
  return {
    tier, paid, paidUntil: paid ? p.paidUntil : 0, trial,
    trialDaysLeft: trial ? Math.max(1, Math.ceil((p.trialEndsAt - now) / DAY_MS)) : 0,
    limits: LIMITS[tier], known: !!planDoc,
  };
}
let planSig = "";
function emitPlan(force) {
  const P = getPlan(), sig = P.tier + "|" + P.trial + "|" + P.paidUntil + "|" + P.known;
  if (!force && sig === planSig) return; // periodic ticks only fire when expiry actually changes the plan
  planSig = sig;
  window.dispatchEvent(new CustomEvent("clipdows:plan", { detail: P }));
}
let planUnsub = null, planFails = 0;
function watchPlan() {
  const p = getPairing(); if (!p) return () => {};
  if (planUnsub) planUnsub();
  planUnsub = onSnapshot(doc(db, "users", p.ownerUid, "meta", "plan"), (snap) => {
    planFails = 0;
    planDoc = snap.exists() ? snap.data() : null;
    try { if (planDoc) localStorage.setItem(PLAN_KEY, JSON.stringify(planDoc)); else localStorage.removeItem(PLAN_KEY); } catch { /* ignore */ }
    emitPlan(true);
  }, () => {
    // Rules not updated yet, or offline: keep the cached plan and retry a few times.
    emitPlan(true);
    if (++planFails <= 5) setTimeout(watchPlan, 20000);
  });
  return planUnsub;
}
setInterval(() => emitPlan(false), 60000); // trial / subscription expiry
function planError(msg) { const e = new Error(msg); e.plan = true; return e; }

// ---------- End-to-end encryption (same wire format as the desktop's firestoreSync.js) ----------
//   users/{uid}/meta/crypto : { v:1, salt:<b64 16 bytes>, iter:250000, check:<payload> }
//   key     = PBKDF2-SHA256(passphrase, salt, iter) -> AES-GCM-256
//   payload = base64( iv(12) || AES-GCM ciphertext ) of JSON text
//   clipboard_items doc = { v:2, type, payload:{content,preview,char_count}, created_at, source, client_id, serverAt }
const enc = new TextEncoder(), dec = new TextDecoder();
let cryptoKey = null, cryptoMeta = undefined; // meta: undefined = not fetched, null = account has no key
function emitCryptoState(state) {
  window.dispatchEvent(new CustomEvent('clipdows:crypto', { detail: { state, ready: !!cryptoKey } }));
}
function toB64(buf) {
  const bytes = new Uint8Array(buf); let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function fromB64(b64) { const bin = atob(b64); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
async function deriveKey(pass, salt, iter) {
  const base = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function encryptWith(key, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(obj))));
  const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12);
  return toB64(out);
}
async function decryptWith(key, payload) {
  const raw = fromB64(payload);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: raw.slice(0, 12) }, key, raw.slice(12));
  return JSON.parse(dec.decode(pt));
}
// The derived key is stored as a NON-extractable CryptoKey in IndexedDB — the passphrase itself is never kept.
function openKeyDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("clipdows-keys", 1);
    req.onupgradeneeded = () => { req.result.createObjectStore("keys"); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function loadStoredKey(uid) {
  try {
    const d = await openKeyDb();
    return await new Promise((resolve) => { const r = d.transaction("keys").objectStore("keys").get(uid); r.onsuccess = () => resolve(r.result || null); r.onerror = () => resolve(null); });
  } catch { return null; }
}
async function saveStoredKey(uid, key) {
  const d = await openKeyDb();
  return new Promise((resolve, reject) => { const tx = d.transaction("keys", "readwrite"); tx.objectStore("keys").put(key, uid); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
}
async function clearStoredKey(uid) {
  const d = await openKeyDb();
  return new Promise((resolve) => { const tx = d.transaction("keys", "readwrite"); tx.objectStore("keys").delete(uid); tx.oncomplete = resolve; tx.onerror = resolve; });
}

/** Figures out whether the paired account uses encryption and whether this phone already holds the key. state: ready | locked | none | blocked */
async function initCrypto() {
  const p = getPairing(); if (!p) return { state: "none" };
  let meta;
  try {
    const snap = await getDoc(doc(db, "users", p.ownerUid, "meta", "crypto"));
    meta = snap.exists() ? snap.data() : null;
  } catch (err) {
    const stored = await loadStoredKey(p.ownerUid);
    if (stored) { cryptoKey = stored; emitCryptoState('ready'); return { state: "ready" }; } // offline: trust the key we already hold
    return { state: "blocked", error: err.code === "permission-denied" ? "rules" : "network" };
  }
  cryptoMeta = meta;
  if (!meta) { cryptoKey = null; emitCryptoState('none'); return { state: "none" }; }
  const stored = await loadStoredKey(p.ownerUid);
  if (stored) {
    try { await decryptWith(stored, meta.check); cryptoKey = stored; emitCryptoState('ready'); return { state: "ready" }; }
    catch { await clearStoredKey(p.ownerUid).catch(() => {}); }
  }
  cryptoKey = null;
  emitCryptoState('locked');
  return { state: "locked" };
}
/** Unlocks with the passphrase you set on your PC. Throws "Wrong passphrase" on mismatch. */
async function unlockWithPassphrase(pass) {
  const p = getPairing(); if (!p) throw new Error("Not paired yet.");
  if (!cryptoMeta) { const r = await initCrypto(); if (r.state === "ready") return true; if (!cryptoMeta) throw new Error("This account isn\u2019t using encryption."); }
  const key = await deriveKey(String(pass || ""), fromB64(cryptoMeta.salt), cryptoMeta.iter || 250000);
  try { await decryptWith(key, cryptoMeta.check); } catch { throw new Error("Wrong passphrase. Try again."); }
  cryptoKey = key;
  await saveStoredKey(p.ownerUid, key).catch(() => {});
  emitCryptoState('ready');
  return true;
}
async function resetKey() { const p = getPairing(); cryptoKey = null; cryptoMeta = undefined; emitCryptoState('none'); if (p) await clearStoredKey(p.ownerUid).catch(() => {}); }
const cryptoReady = () => !!cryptoKey;

// Shared account metadata mirrors the Windows dashboard's users/{uid}/meta
// documents. The paired anonymous phone can read shared data and writes only
// the narrowly allowed profile, Focus settings, and encrypted review records.
function sharedMetaCollection(pairing = getPairing()) {
  if (!pairing?.ownerUid) throw new Error('Pair ClipDows before syncing account data.');
  return collection(db, 'users', pairing.ownerUid, 'meta');
}
function watchSharedDoc(name, onChange, onError = () => {}) {
  if (!['profile', 'focusSettings'].includes(name) || !getPairing()) return () => {};
  const pair = getPairing(), ref = doc(db, 'users', pair.ownerUid, 'meta', name);
  return onSnapshot(ref, (snap) => {
    if (getPairing()?.ownerUid !== pair.ownerUid) return;
    onChange(snap.exists() ? snap.data() : null, { fromCache: snap.metadata.fromCache });
  }, onError);
}
async function writeSharedDoc(name, value) {
  const pair = getPairing();
  if (!pair || !['profile', 'focusSettings'].includes(name)) throw new Error('This account setting cannot be changed from the phone.');
  if (name === 'focusSettings' && (!value || typeof value.focusCapture !== 'boolean' || !Array.isArray(value.focusTopics) || !Array.isArray(value.focusCustomTopics) || typeof value.updatedAt !== 'number')) throw new Error('Invalid shared Focus settings.');
  if (name === 'profile' && (!value || typeof value.photoDataUrl !== 'string' || typeof value.updatedAt !== 'number')) throw new Error('Invalid shared profile.');
  await setDoc(doc(db, 'users', pair.ownerUid, 'meta', name), value);
}
function focusReviewDocId(id) {
  return 'focusReview_' + btoa(unescape(encodeURIComponent(String(id)))).split('+').join('-').split('/').join('_').replace(/=+$/g, '');
}
function watchFocusReview(onChange, onError = () => {}) {
  const pair = getPairing(); if (!pair) return () => {};
  const uid = pair.ownerUid;
  return onSnapshot(sharedMetaCollection(pair), (snap) => {
    if (getPairing()?.ownerUid !== uid) return;
    const docs = snap.docs.filter((d) => d.id.startsWith('focusReview_') && d.data().kind === 'focusReview');
    onChange(docs.map((d) => ({ id: d.id, ...d.data() })));
  }, onError);
}
async function writeFocusReviewRecord(record) {
  const pair = getPairing();
  if (!pair || !record || typeof record.reviewId !== 'string') throw new Error('Focus Review is not paired.');
  await setDoc(doc(db, 'users', pair.ownerUid, 'meta', focusReviewDocId(record.reviewId)), record);
}
async function deleteFocusReviewRecord(id) {
  const pair = getPairing(); if (!pair) return;
  await deleteDoc(doc(db, 'users', pair.ownerUid, 'meta', focusReviewDocId(id)));
}
async function encryptSyncPayload(value) {
  if (!cryptoKey) throw new Error('Unlock sync with your Windows passphrase before syncing Focus Review.');
  return encryptWith(cryptoKey, value);
}
async function decryptSyncPayload(value) {
  if (!cryptoKey) throw new Error('Unlock sync with your Windows passphrase before opening Focus Review.');
  return decryptWith(cryptoKey, value);
}

/** Builds the Firestore document for an outgoing item (encrypted when the account has a key). */
async function buildDoc(pairing, type, content, preview, charCount) {
  const base = { created_at: Date.now(), source: "phone:" + pairing.phoneUid, client_id: cid(), deviceName: pairing.deviceName, serverAt: serverTimestamp() };
  if (cryptoKey) {
    const payload = await encryptWith(cryptoKey, { content, preview, char_count: charCount });
    if (payload.length > MAX_PAYLOAD_CHARS) throw new Error("That item is too large to send.");
    return { v: 2, type, payload, ...base };
  }
  if (cryptoMeta) throw new Error("ClipDows is locked \u2014 unlock it with your passphrase first.");
  return { type, content, preview, char_count: charCount, ...base }; // account has no encryption set up (legacy plaintext)
}

function detectType(text) {
  if (!text) return "text";
  if (/^(https?:\/\/|www\.)\S+$/i.test(text.trim())) return "link";
  const codeHints = [/^\s*(const|let|var|function|class|import|export|def|SELECT|<\?php|#include)\b/, /[{};]\s*$/m, /=>/];
  if (codeHints.some((re) => re.test(text)) && text.length > 20) return "code";
  return "text";
}

function makePreview(type, content) {
  if (type === "image" || type === "file") return content.name || "Shared file";
  const flat = String(content).replace(/\s+/g, " ").trim();
  return flat.length > 140 ? flat.slice(0, 140) + "…" : flat;
}

const cid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random());
let LATEST = [];              // newest items from the live listener
const RECENT = new Map();     // content pushed in the last 30s (covers the gap before the listener updates)
const dkey = (s) => s.length + ":" + s.slice(0, 80) + s.slice(-80);
/** True if this exact text/image is already at the top of the feed or was just pushed \u2014 prevents double entries. */
function isDuplicate(content) {
  const now = Date.now(), k = dkey(content);
  for (const [key, ts] of RECENT) if (now - ts > 30000) RECENT.delete(key);
  if (RECENT.has(k)) return true;
  const dup = LATEST.slice(0, 5).some((i) => i.content === content && now - (i.created_at || 0) < 10 * 60 * 1000);
  if (!dup) RECENT.set(k, now);
  return dup;
}

/** Pushes a text/link/code item from the phone up to the owner's clipboard_items. */
async function pushTextItem(text) {
  const pairing = getPairing();
  if (!pairing) throw new Error("Not paired yet.");
  if (isDuplicate(text)) return false;
  const type = detectType(text);
  await addDoc(collection(db, "users", pairing.ownerUid, "clipboard_items"), await buildDoc(pairing, type, text, makePreview(type, text), text.length));
}

/** Pushes an image (as a data URL) from the phone up to the owner's clipboard_items. Image sync is a Pro/Max feature. */
async function pushImageItem(dataUrl) {
  const pairing = getPairing();
  if (!pairing) throw new Error("Not paired yet.");
  if (!getPlan().limits.syncImages) throw planError("Image sync is a Pro feature. Upgrade from ClipDows on your PC.");
  if (isDuplicate(dataUrl)) return false;
  if (dataUrl.length > MAX_INLINE_IMAGE_BYTES) {
    // dataUrl.length is already the inflated base64 size; warn before Firestore rejects the write.
    throw new Error("That image is too large to send inline. Try a smaller photo or a screenshot.");
  }
  await addDoc(collection(db, "users", pairing.ownerUid, "clipboard_items"), await buildDoc(pairing, "image", dataUrl, "Image", 0));
}

/** Subscribes to the newest items for the paired owner account (as many as the plan syncs), newest first. Encrypted items are decrypted here. */
let watchSeq = 0, lastLockedEvent = 0;
function watchItems(onChange, onError) {
  const pairing = getPairing();
  if (!pairing) return () => {};
  const cap = Math.max(25, Math.min(1000, getPlan().limits.syncItems));
  const q = query(collection(db, "users", pairing.ownerUid, "clipboard_items"), orderBy("created_at", "desc"), limit(cap));
  return onSnapshot(q, async (snap) => {
    const seq = ++watchSeq;
    let undecryptable = 0;
    const items = await Promise.all(snap.docs.map(async (d) => {
      const raw = d.data();
      if (!raw.payload) return { id: d.id, ...raw, _raw: raw };            // legacy plaintext item
      if (cryptoKey) {
        try { return { id: d.id, ...raw, ...(await decryptWith(cryptoKey, raw.payload)), _raw: raw }; } catch { /* fall through */ }
      }
      undecryptable++; return null;
    }));
    if (seq !== watchSeq) return; // a newer snapshot already won
    const ok = items.filter(Boolean);
    if (undecryptable && Date.now() - lastLockedEvent > 8000) {
      lastLockedEvent = Date.now();
      window.dispatchEvent(new CustomEvent("clipdows:locked", { detail: { hadKey: !!cryptoKey } }));
    }
    LATEST = ok;
    onChange(ok);
  }, onError);
}

async function unpairDevice() {
  const pairing = getPairing();
  if (pairing) {
    try { await deleteDoc(doc(db, "users", pairing.ownerUid, "linkedDevices", pairing.phoneUid)); } catch { /* best effort — may already be gone */ }
  }
  clearPairing();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---------- "Install as app" prompt ----------
// The actual `beforeinstallprompt` listener is registered as an early inline
// <script> in <head> (before this module even starts loading) so we never
// miss the event — Chrome can fire it very early. That script stores the
// event on window.__deferredInstallPrompt; these helpers just use it.
function canPromptInstall() {
  return !!window.__deferredInstallPrompt;
}
async function promptInstall() {
  const evt = window.__deferredInstallPrompt;
  if (!evt) return { outcome: "unavailable" };
  evt.prompt();
  const choice = await evt.userChoice; // { outcome: 'accepted' | 'dismissed' }
  window.__deferredInstallPrompt = null;
  return choice;
}
function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}
function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

// ---------- IndexedDB inbox for content shared in from other Android apps ----------
// service-worker.js writes here when the OS "Share" sheet POSTs to /share-target;
// this page reads it back out so the user can review + send each item to their PC.
const SHARE_DB_NAME = "clipdows-share";
const SHARE_STORE = "pending";

function openShareDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(SHARE_DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(SHARE_STORE, { keyPath: "id", autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getPendingShares() {
  const dbc = await openShareDb();
  return new Promise((resolve, reject) => {
    const tx = dbc.transaction(SHARE_STORE, "readonly");
    const items = [];
    tx.objectStore(SHARE_STORE).openCursor().onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) { items.push(cursor.value); cursor.continue(); } else resolve(items);
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function deletePendingShare(id) {
  const dbc = await openShareDb();
  return new Promise((resolve, reject) => {
    const tx = dbc.transaction(SHARE_STORE, "readwrite");
    tx.objectStore(SHARE_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Returns an image data URL that fits under the Firestore doc limit, downscaling big photos. */
async function prepareImage(file) {
  const original = await fileToDataUrl(file);
  if (original.length <= MAX_INLINE_IMAGE_BYTES) return original;
  let bitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error("Couldn't read that image. Try a different one."); }
  let maxSide = 1600, quality = 0.82;
  try {
    for (let attempt = 0; attempt < 6; attempt++) {
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); // white behind transparent PNGs
      ctx.drawImage(bitmap, 0, 0, w, h);
      const out = canvas.toDataURL("image/jpeg", quality);
      if (out.length <= MAX_INLINE_IMAGE_BYTES) return out;
      maxSide = Math.round(maxSide * 0.75);
      quality = Math.max(0.5, quality - 0.08);
    }
  } finally {
    if (bitmap.close) bitmap.close();
  }
  throw new Error("That image is too large to send. Try a smaller photo or a screenshot.");
}

async function deleteItem(id) {
  const p = getPairing(); if (!p) throw new Error("Not paired yet.");
  await deleteDoc(doc(db, "users", p.ownerUid, "clipboard_items", id));
}
async function restoreItem(item) {
  const p = getPairing(); if (!p) throw new Error("Not paired yet.");
  const { id, _raw, ...plain } = item;
  await setDoc(doc(db, "users", p.ownerUid, "clipboard_items", id), _raw || plain);
}
/** Deletes every clip (phone + PC copies) for the paired account; returns how many. */
async function clearAllItems() {
  const p = getPairing(); if (!p) throw new Error("Not paired yet.");
  const col = collection(db, "users", p.ownerUid, "clipboard_items");
  let n = 0;
  for (;;) {
    const snap = await getDocs(query(col, limit(400)));
    if (snap.empty) break;
    const b = writeBatch(db); snap.docs.forEach((d) => b.delete(d.ref)); await b.commit(); n += snap.size;
  }
  LATEST = []; RECENT.clear();
  return n;
}

window.ClipDowsApp = {
  getPairing, setPairing, clearPairing, ensureAnonAuth,
  claimPairingCode, pushTextItem, pushImageItem, watchItems, unpairDevice,
  fileToDataUrl, prepareImage, detectType, deleteItem, restoreItem, clearAllItems, getPendingShares, deletePendingShare,
  canPromptInstall, promptInstall, isStandalone, isIos,
  pushSupported, pushPermission, enablePush, disablePush, isPushEnabled, onForegroundPush,
  getPlan, watchPlan, LIMITS, initCrypto, unlockWithPassphrase, resetKey, cryptoReady, getLatest: () => LATEST,
  watchSharedDoc, writeSharedDoc, watchFocusReview, writeFocusReviewRecord, deleteFocusReviewRecord, encryptSyncPayload, decryptSyncPayload,
};

// Signal readiness for pages that need to wait before enabling buttons —
// loading the Firebase SDKs over the network can take a couple of seconds on
// mobile, and calling into ClipDowsApp before this fires is what produced
// "Cannot read properties of undefined (reading 'claimPairingCode')".
if (initError) {
  window.__clipdowsError = initError;
  window.dispatchEvent(new CustomEvent("clipdows:error", { detail: initError }));
} else {
  window.__clipdowsReady = true;
  window.dispatchEvent(new CustomEvent("clipdows:ready"));
}

/**
 * Resolves once app.js has finished loading Firebase, or rejects if it
 * failed or took too long. Pages should await this before enabling any
 * button that calls into ClipDowsApp, instead of guessing with a timeout.
 */
window.clipdowsWaitReady = function (timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    if (window.__clipdowsReady) return resolve();
    if (window.__clipdowsError) return reject(window.__clipdowsError);
    const onReady = () => { cleanup(); resolve(); };
    const onError = (e) => { cleanup(); reject(e.detail || new Error("Failed to load.")); };
    const timer = setTimeout(() => { cleanup(); reject(new Error("Taking too long to connect — check your internet connection.")); }, timeoutMs);
    function cleanup() {
      clearTimeout(timer);
      window.removeEventListener("clipdows:ready", onReady);
      window.removeEventListener("clipdows:error", onError);
    }
    window.addEventListener("clipdows:ready", onReady);
    window.addEventListener("clipdows:error", onError);
  });
};

// ---------- Presence heartbeat (feeds the admin dashboard's "online now" / active-user counts) ----------
(function () {
  if (!auth || !db) return;
  const beat = () => {
    const u = auth.currentUser;
    if (!u || document.visibilityState !== "visible") return;
    setDoc(doc(db, "presence", u.uid), { platform: "pwa", lastSeen: serverTimestamp() }).catch(() => {});
  };
  document.addEventListener("visibilitychange", beat);
  setInterval(beat, 3 * 60 * 1000);
  onAuthStateChanged(auth, (u) => { if (u) beat(); });
})();
