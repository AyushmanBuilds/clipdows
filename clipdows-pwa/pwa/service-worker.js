// service-worker.js — installable shell, Share-target inbox, push notifications, and auto-update.
// BUILD_ID is rewritten on every `firebase deploy` by scripts/stamp-version.js;
// changing these bytes is what makes every phone install the new worker.
const BUILD_ID = "20260930032113";
const CACHE_NAME = "clipdows-" + BUILD_ID;
const SDK_CACHE = "clipdows-sdk";
const SHARE_DB_NAME = "clipdows-share";
const SHARE_STORE = "pending";
const DEBUG_PUSH = false;   

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((c) => c.addAll(["/index.html", "/pair.html", "/style.css", "/app.js", "/premium.js", "/focus.js", "/qrcode.lib.js", "/manifest.json"]))
      .catch(() => {})
  );
  self.skipWaiting();
});

// ---------- Push notifications (Firebase Cloud Messaging) ----------
// Classic (non-module) service workers can importScripts the "compat" builds.
// Same public web config as app.js (Firebase web config is not a secret).
try {
  importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js");
  importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js");
  firebase.initializeApp({
    apiKey: "AIzaSyCM-ay_5E70skMszLlYziZgafrkQ25SWS8",
    authDomain: "clipdows-c20d5.firebaseapp.com",
    projectId: "clipdows-c20d5",
    storageBucket: "clipdows-c20d5.firebasestorage.app",
    messagingSenderId: "229362038617",
    appId: "1:229362038617:web:9145117fe7b3a610227e48",
  });
  const messaging = firebase.messaging();

  // Fires when a push arrives while ClipDows isn't the focused tab/app.
  messaging.onBackgroundMessage(async (payload) => {
    const data = payload.data || {};
    const notif = payload.notification || {};
    const title = notif.title || data.title || "ClipDows";
    const body = notif.body || data.body || "New clip from your PC";
    const daily = data.type === "daily";
    let dbg = "";
    if (daily && data.image) {
      // Wake-up pushes can arrive before the radio is ready: wait for the network, then show.
      let ok = false, tries = 0;
      while (!ok && tries < 4) {
        tries++;
        try { await fetch(data.image, { mode: "no-cors" }); ok = true; }
        catch (e) { await new Promise((r) => setTimeout(r, 1500)); }
      }
      if (DEBUG_PUSH) dbg = ok ? "\n[debug: image reachable, try " + tries + "]" : "\n[debug: image unreachable after 4 tries]";
    } else if (DEBUG_PUSH && daily) dbg = "\n[debug: NO image in push data]";
    return self.registration.showNotification(title, {
      body: body + dbg,
      icon: daily ? "/notif-icon.png" : "/icon-192.png",   // your custom notification icon
      badge: "/notif-badge.png",                           // small monochrome status-bar icon (Android)
      image: daily && data.image ? data.image : undefined, // big picture you attach from the dashboard
      tag: daily ? "clipdows-daily" : "clipdows-clip",
      renotify: !daily,
      vibrate: daily ? [120, 60, 120] : [60, 40, 60],
      actions: daily ? [{ action: "open", title: "Open ClipDows" }] : [],
      data: { url: data.url || "/index.html" },
    });
  });
} catch (err) {
  // FCM not reachable (offline install, or the browser doesn't support it) — the rest of the SW still works fine.
  console.warn("[ClipDows SW] push messaging unavailable:", err);
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/index.html";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) { if (c.url.includes(new URL(url, self.location.origin).pathname) && "focus" in c) return c.focus(); }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== SDK_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method === "POST" && url.pathname === "/share-target") {
    event.respondWith(handleShareTarget(event));
    return;
  }
  if (req.method !== "GET") return;

  // Firebase SDK modules are versioned/immutable: cache-first = instant + works offline.
  if (url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/")) {
    event.respondWith(
      caches.open(SDK_CACHE).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; })))
    );
    return;
  }

  // Own files: network-first (always the newest deploy), cache as offline fallback.
  if (url.origin === location.origin && !url.pathname.startsWith("/__/") && url.pathname !== "/version.json") {
    event.respondWith(
      fetch(req, req.mode === "navigate" ? undefined : { cache: "no-cache" })
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE_NAME).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }))
    );
  }
});

function openShareDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(SHARE_DB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(SHARE_STORE, { keyPath: "id", autoIncrement: true }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function putShare(entry) {
  return openShareDb().then((dbc) => new Promise((resolve, reject) => {
    const tx = dbc.transaction(SHARE_STORE, "readwrite");
    tx.objectStore(SHARE_STORE).add(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
}
async function handleShareTarget(event) {
  try {
    const formData = await event.request.formData();
    const title = formData.get("title") || "", text = formData.get("text") || "", url = formData.get("url") || "";
    const files = formData.getAll("media").filter((f) => f && f.size > 0);
    if (files.length) {
      for (const file of files) await putShare({ kind: "file", blob: file, mime: file.type || "application/octet-stream", name: file.name || "shared-file", createdAt: Date.now() });
    } else if (text || url || title) {
      await putShare({ kind: "text", text: [title, text, url].filter(Boolean).join("\n"), createdAt: Date.now() });
    }
  } catch (err) { console.error("[ClipDows SW] failed to store shared content:", err); }
  return Response.redirect("/index.html?shared=1", 303);
}
