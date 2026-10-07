// premium.js — capture, theming, smart clips, handoff pill, auto-update.
const A = () => window.ClipDowsApp;
const KEY = "clipdows.settings";
const DEF = { theme: "auto", accent: "violet", autoCapture: true, autoCopy: true, shield: true, haptics: true, compact: false, secretExpire: false, secretTtl: "0" };
let S = { ...DEF };
try { S = { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
const $ = (id) => document.getElementById(id);
const buzz = (ms = 12) => { if (S.haptics && navigator.vibrate) navigator.vibrate(ms); };

function toast(title, sub) {
  const t = $("toast"); if (!t) return;
  $("toastTitle").textContent = title; $("toastSub").textContent = sub || "";
  t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 2600);
}

// ---------- Theme ----------
function applyTheme() {
  const d = document.documentElement;
  d.dataset.theme = S.theme; d.dataset.accent = S.accent; d.dataset.compact = S.compact ? "1" : "0";
  requestAnimationFrame(() => {
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.content = getComputedStyle(document.body).backgroundColor;
  });
}

// ---------- Clipboard capture ----------
const hash = (s) => { let h = 5381; for (let i = 0; i < Math.min(s.length, 6000); i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return s.length + ":" + h; };
let known = new Set(), lastKey = localStorage.getItem("clipdows.lastCapture") || "";
async function capture(manual) {
  if (!A() || !A().getPairing()) return;
  if (!manual && (!S.autoCapture || document.visibilityState !== "visible")) return;
  let text = "", img = null;
  try {
    for (const it of await navigator.clipboard.read()) {
      const ty = it.types.find((t) => t.startsWith("image/"));
      if (ty) { img = await it.getType(ty); break; }
      if (it.types.includes("text/plain")) text = await (await it.getType("text/plain")).text();
    }
  } catch {
    try { text = await navigator.clipboard.readText(); }
    catch { if (manual) toast("Clipboard blocked", "Allow clipboard access for ClipDows in browser site settings"); return; }
  }
  try {
    if (img) {
      const key = "img:" + img.size; if (key === lastKey) { if (manual) toast("Already captured"); return; }
      lastKey = key; localStorage.setItem("clipdows.lastCapture", key);
      await A().pushImageItem(await A().prepareImage(img));
    } else {
      text = (text || "").trim();
      if (!text) { if (manual) toast("Clipboard is empty"); return; }
      const key = hash(text);
      if (key === lastKey || known.has(text)) { lastKey = key; if (manual) toast("Already in ClipDows"); return; }
      lastKey = key; localStorage.setItem("clipdows.lastCapture", key);
      await A().pushTextItem(text);
    }
    buzz(); toast("Captured", "Copied on this phone \u2192 synced to your PC");
  } catch (e) { toast("Couldn\u2019t capture", e.message || "Try again"); }
}

// ---------- Handoff pill: new PC clip -> one tap to have it on the phone ----------
let baseline = false, seen = new Set(), pillTimer, newestSeen = 0;
function onFeed(items) {
  known = new Set(items.map((i) => i.content));
  updateStats(items); applyFilter();
  // Older clips that merely appear because the plan window grew are not "new from PC" (2-minute clock-skew tolerance).
  const fresh = items.filter((i) => !seen.has(i.id) && (i.created_at || 0) > newestSeen - 120000);
  items.forEach((i) => { seen.add(i.id); newestSeen = Math.max(newestSeen, i.created_at || 0); });
  if (!baseline) { baseline = true; return; }
  const pc = fresh.find((i) => (i.source || "").startsWith("desktop:") && i.type !== "image");
  if (!pc) return;
  buzz(18);
  if (S.autoCopy && !isSecret(pc)) {
    navigator.clipboard.writeText(pc.content).then(() => toast("PC \u2192 phone", "Copied automatically \u2014 ready to paste"), () => showPill(pc));
  } else showPill(pc);
}
function showPill(item) {
  let p = $("handoff");
  if (!p) { p = document.createElement("div"); p.id = "handoff"; p.className = "handoff"; document.body.appendChild(p); }
  p.innerHTML = '<div class="h-dot"></div><div class="h-txt"><b>New from your PC</b><span></span></div><button>Copy</button>';
  p.querySelector("span").textContent = isSecret(item) ? "Sensitive \u2022 tap Copy" : (item.preview || item.content || "").slice(0, 70);
  p.querySelector("button").onclick = async () => { try { await navigator.clipboard.writeText(item.content); buzz(); toast("Copied", "Ready to paste"); } catch { toast("Copy failed"); } p.hidden = true; };
  p.hidden = false; clearTimeout(pillTimer); pillTimer = setTimeout(() => { p.hidden = true; }, 9000);
}

// ---------- Secret shield + smart actions ----------
function isSecret(item) {
  if (!S.shield || (item.type !== "text" && item.type !== "code")) return false;
  const c = (item.content || "").trim();
  if (classify(c)) return true;
  return /^\d{4,8}$/.test(c) || /^(?:\d[ -]?){13,19}$/.test(c) || (c.length < 140 && /(otp|code|pin|verification|passcode)/i.test(c) && /\b\d{4,8}\b/.test(c));
}
function smart(item) {
  const c = (item.content || "").trim();
  if (item.type === "link") return ["Open", /^https?:/i.test(c) ? c : "https://" + c];
  if (item.type === "text" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)) return ["Email", "mailto:" + c];
  if (item.type === "text" && /^\+?[\d\s()-]{10,16}$/.test(c)) return ["Call", "tel:" + c.replace(/[^\d+]/g, "")];
  return null;
}
const LABEL = { text: "Text", link: "Link", code: "Code", image: "Image", file: "File", snippet: "Snippet" };
const TRASH = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3"/></svg>';
const QR_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/><path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20v.01"/></svg>';

// ---------- QR-to-share: render a clip as a scannable QR code, entirely on-device ----------
// Uses the vendored qrcode.lib.js (window.qrcode) — no network call, works offline,
// and the receiving device never has to touch Firebase at all.
const QR_MAX_CHARS = 1400; // stays comfortably inside QR version 40 / level M capacity
function qrPayload(item) {
  if (item.type === "link") { const c = (item.content || "").trim(); return /^https?:\/\//i.test(c) ? c : "https://" + c; }
  return item.content || "";
}
function showQr(item) {
  const overlay = $("qrOverlay"), mount = $("qrCodeMount"), caption = $("qrCaption");
  if (!overlay || !window.qrcode) { toast("Can\u2019t show QR", "QR module failed to load"); return; }
  const text = qrPayload(item);
  if (!text) { toast("Nothing to encode"); return; }
  if (text.length > QR_MAX_CHARS) { toast("Too long for a QR code", "Try a shorter clip"); return; }
  try {
    const qr = window.qrcode(0, "M");
    qr.addData(text);
    qr.make();
    mount.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  } catch (e) {
    toast("Couldn\u2019t generate QR", "Try a shorter clip");
    return;
  }
  caption.textContent = item.type === "link" ? text : (item.preview || text).slice(0, 90);
  overlay.hidden = false;
  buzz(10);
}
function closeQr() { const o = $("qrOverlay"); if (o) o.hidden = true; }
function enhanceCard(el, item) {
  el.dataset.type = item.type;
  el.dataset.src = (item.source || "").startsWith("desktop:") ? "pc" : "phone";
  el.dataset.q = (item.type === "image" ? "image " + ocrText(item.id) : item.content || "").slice(0, 500).toLowerCase();
  const tag = el.querySelector(".card-top > span:last-child");
  if (tag) { tag.className = "ctype"; tag.textContent = LABEL[item.type] || "Clip"; }
  const prev = el.querySelector(".card-preview");
  if (prev && isSecret(item)) {
    prev.classList.add("secret"); prev.title = "Tap to reveal";
    prev.addEventListener("click", () => prev.classList.toggle("secret"));
    el.classList.add("is-secret");
  }
  const row = el.querySelector(".card-row-actions"); if (!row) return;
  const s = smart(item);
  if (s) { const a = document.createElement("a"); a.className = "card-action"; a.textContent = s[0]; a.href = s[1]; a.target = "_blank"; a.rel = "noopener"; row.appendChild(a); }
  else if (item.type !== "image" && navigator.share) {
    const b = document.createElement("button"); b.className = "card-action"; b.textContent = "Share";
    b.onclick = () => navigator.share({ text: item.content }).catch(() => {}); row.appendChild(b);
  }
  if (item.type !== "image") {
    const qrBtn = document.createElement("button");
    qrBtn.className = "card-action icon"; qrBtn.setAttribute("aria-label", "Show as QR code"); qrBtn.title = "Show as QR code";
    qrBtn.innerHTML = QR_ICON;
    qrBtn.onclick = () => showQr(item);
    row.appendChild(qrBtn);
  }
  const more = document.createElement("button");
  more.className = "card-action icon"; more.setAttribute("aria-label", "More options"); more.title = "Pin, actions, stack\u2026"; more.textContent = "\u22EF";
  more.onclick = () => openMore(item);
  row.appendChild(more);
  const del = document.createElement("button");
  del.className = "card-action icon danger"; del.setAttribute("aria-label", "Delete"); del.innerHTML = TRASH;
  del.onclick = async () => {
    try {
      await A().deleteItem(item.id); buzz(14);
      snack("Clip deleted", "Undo", () => A().restoreItem(item).catch(() => toast("Couldn\u2019t restore")));
    } catch { toast("Couldn\u2019t delete", "Check your connection"); }
  };
  row.appendChild(del);
}

// ---------- Snackbar with Undo ----------
function snack(msg, label, fn) {
  let s = $("snack");
  if (!s) { s = document.createElement("div"); s.id = "snack"; s.className = "snack"; document.body.appendChild(s); }
  s.innerHTML = "<span></span>" + (label ? "<button></button>" : "");
  s.firstChild.textContent = msg;
  if (label) { const b = s.querySelector("button"); b.textContent = label; b.onclick = () => { s.hidden = true; fn(); }; }
  s.hidden = false; clearTimeout(snack.t); snack.t = setTimeout(() => { s.hidden = true; }, 5000);
}

// ---------- Title, search + filter chips ----------
let fq = "", ft = "all";
function buildToolbar() {
  const feed = $("feed"); if (!feed || $("toolbar")) return;
  const tb = document.createElement("div"); tb.id = "toolbar"; tb.className = "toolbar";
  tb.innerHTML = '<div class="tb-head"><h2>Clipboard</h2><span id="tbStats"></span></div>' +
    '<label class="search"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg><input id="searchInput" type="search" placeholder="Search your clips" autocomplete="off"></label>' +
    '<div class="chips">' + [["all", "All"], ["text", "Text"], ["link", "Links"], ["code", "Code"], ["image", "Images"], ["pc", "From PC"]]
      .map(([v, l]) => '<button data-f="' + v + '" class="' + (v === "all" ? "on" : "") + '">' + l + "</button>").join("") + "</div>" +
    '<div class="nomatch" id="noMatch" hidden>No clips match your search</div>';
  feed.prepend(tb);
  $("searchInput").oninput = (e) => { fq = e.target.value.trim().toLowerCase(); applyFilter(); };
  tb.querySelector(".chips").onclick = (e) => {
    const b = e.target.closest("button"); if (!b) return; ft = b.dataset.f;
    tb.querySelectorAll(".chips button").forEach((x) => x.classList.toggle("on", x === b)); applyFilter(); buzz(6);
  };
}
function applyFilter() {
  let total = 0, shown = 0;
  document.querySelectorAll("#itemsGrid .card, #pinnedGrid .card").forEach((c) => {
    total++;
    const okT = ft === "all" || (ft === "pc" ? c.dataset.src === "pc" : c.dataset.type === ft);
    const ok = okT && (!fq || (c.dataset.q || "").includes(fq));
    c.hidden = !ok; if (ok) shown++;
  });
  const nm = $("noMatch"); if (nm) nm.hidden = !(total > 0 && shown === 0);
}
function updateStats(items) {
  const el = $("tbStats"); if (!el) return;
  const pc = items.filter((i) => (i.source || "").startsWith("desktop:")).length;
  el.textContent = items.length ? items.length + " clips \u00B7 " + pc + " from PC" + (lockedN ? " \u00B7 " + lockedN + " older locked" : "") : "";
}

// ---------- Settings UI ----------
const ROWS = [
  ["autoCapture", "Auto-capture on open", "Grabs whatever you copied the moment ClipDows opens or regains focus"],
  ["autoCopy", "Auto-copy PC clips", "Puts new PC copies on this phone\u2019s clipboard"],
  ["shield", "Shield sensitive clips", "Blurs OTPs and card numbers until you tap them"],
  ["secretExpire", "Auto-delete sensitive clips", "Removes OTPs, cards and keys after 1\u20132 minutes, like your PC does"],
  ["haptics", "Haptic feedback", "Subtle vibration on capture and handoff"],
  ["compact", "Compact cards", "Fit more clips on screen"],
];
function pushRowHtml() {
  const a = A();
  if (!a || !a.pushSupported()) return "";
  const on = a.isPushEnabled();
  const perm = a.pushPermission();
  const sub = perm === "denied"
    ? "Blocked in your browser\u2019s site settings for this page"
    : "Alerts you the instant your PC copies something";
  return `
    <div class="settings-group"><h4>Notifications</h4>
      <label class="settings-row tog"><span><span class="label">Push notifications</span><small>${sub}</small></span>
        <input type="checkbox" id="pushToggle" ${on ? "checked" : ""} ${perm === "denied" ? "disabled" : ""}><i></i></label>
    </div>`;
}


function planGroupHtml() {
  const P = plan(), L = P.limits, u = (n) => (n < 0 ? "Unlimited" : n.toLocaleString("en-IN"));
  const sub = !P.known ? "Open ClipDows on your PC to sync your plan." : P.trial ? `${plural(P.trialDaysLeft, "day")} left in your free Pro trial.` : P.tier === "free" ? "Upgrade for more history, sync and power features." : P.paid ? `Active until ${fmtDate(P.paidUntil)}.` : "Thanks for supporting ClipDows.";
  const row = (l, v) => `<div class="settings-row"><span class="label">${l}</span><span class="value">${v}</span></div>`;
  return `<div class="settings-group"><h4>Your plan</h4>
      <div class="settings-row tap" id="planRow"><span><span class="label">ClipDows ${esc(planLabel(P))}</span><small>${esc(sub)}</small></span><span class="plan-badge ${P.tier}">${esc(planLabel(P))}</span></div>
      ${row("Synced clips", u(L.syncItems))}${row("Pinned items", u(L.pinned))}${row("Snippets", u(L.snippets))}${row("Linked phones", u(L.phones))}${row("Image sync", L.syncImages ? "On" : "Pro")}
      <div class="settings-row"><span><small style="max-width:none">Upgrade from ClipDows on your Windows PC \u2014 plans can\u2019t be bought on the phone.</small></span></div>
    </div>`;
}
function secretTtlRowHtml() {
  const locked = !lim().customExpiry, cur = locked ? "0" : String(S.secretTtl || "0");
  const opts = [["0", "Default (1\u20132 min)"], ["30", "30 seconds"], ["60", "1 minute"], ["120", "2 minutes"], ["300", "5 minutes"], ["600", "10 minutes"]];
  return `<div class="settings-row"><span><span class="label">Secret expiry time${locked ? '<em class="tier-tag">Pro</em>' : ""}</span><small>How long sensitive clips stay before they are deleted</small></span><select id="secretTtl" class="cdx-select">${opts.map(([v, l]) => `<option value="${v}" ${cur === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>`;
}

function renderPrefs() {
  const m = $("prefsMount"); if (!m) return;
  const seg = (k, opts) => opts.map(([v, l]) => `<button data-k="${k}" data-v="${v}" class="${S[k] === v ? "on" : ""}">${l}</button>`).join("");
  m.innerHTML = `
    ${planGroupHtml()}
    <div class="settings-group"><h4>Appearance</h4>
      <div class="settings-row"><span class="label">Theme</span><div class="seg">${seg("theme", [["auto", "Auto"], ["light", "Light"], ["dark", "Dark"]])}</div></div>
      <div class="settings-row"><span class="label">Accent</span><div class="dots">${["violet", "emerald", "amber", "rose"].map((a) => `<button data-k="accent" data-v="${a}" class="dot-${a} ${S.accent === a ? "on" : ""}" aria-label="${a}"></button>`).join("")}</div></div>
    </div>
    <div class="settings-group"><h4>Capture &amp; sync</h4>
      ${ROWS.map(([k, l, d]) => `<label class="settings-row tog"><span><span class="label">${l}</span><small>${d}</small></span><input type="checkbox" data-t="${k}" ${S[k] ? "checked" : ""}><i></i></label>`).join("")}
      ${secretTtlRowHtml()}
    </div>
    ${pushRowHtml()}
    <div class="settings-group"><h4>Storage</h4>
      <div class="settings-row tap" id="exportBtn"><span><span class="label">Export clips${lim().export ? "" : '<em class="tier-tag">Pro</em>'}</span><small>Save your synced clips as a JSON file</small></span><span class="value">\u203A</span></div>
      <div class="settings-row tap danger-row" id="clearAll"><span><span class="label">Delete all clips</span><small>Removes every clip from this phone and your PC</small></span><span class="value">\u203A</span></div>
    </div>
    <div class="settings-group"><h4>About</h4>
      <div class="settings-row"><span class="label">Version</span><span class="value" id="buildLabel">\u2026</span></div>
      <div class="settings-row"><span class="label">Duplicates merged</span><span class="value" id="dupLabel">none</span></div>
      <div class="settings-row tap" id="checkUpd"><span class="label">Check for updates</span><span class="value">\u203A</span></div>
    </div>`;
  m.onclick = (e) => { const b = e.target.closest("button[data-k]"); if (!b) return; S[b.dataset.k] = b.dataset.v; save(); applyTheme(); renderPrefs(); buzz(8); };
  m.onchange = async (e) => {
    if (e.target.id === "pushToggle") {
      const box = e.target; box.disabled = true;
      try {
        if (box.checked) { await A().enablePush(); toast("Notifications on", "You\u2019ll be alerted when your PC copies something"); }
        else { await A().disablePush(); toast("Notifications off"); }
      } catch (err) { toast("Couldn\u2019t update", err.message || "Try again"); }
      renderPrefs();
      return;
    }
    const t = e.target.dataset.t; if (!t) return;
    S[t] = e.target.checked; save(); applyTheme(); if (t === "autoCapture" && S[t]) capture(true);
  };
  $("clearAll").onclick = async () => {
    if (!confirm("Delete ALL clips from ClipDows on this phone and your PC? This can\u2019t be undone.")) return;
    try { const n = await A().clearAllItems(); buzz(25); toast("Cleared", n + " clip" + (n === 1 ? "" : "s") + " deleted"); }
    catch { toast("Couldn\u2019t clear", "Check your connection"); }
  };
  $("exportBtn").onclick = exportClips;
  const planRow = $("planRow"); if (planRow) planRow.onclick = openPricing;
  const ttlSel = $("secretTtl");
  if (ttlSel) ttlSel.onchange = () => { if (!lim().customExpiry) { upgrade("customExpiry"); ttlSel.value = "0"; return; } S.secretTtl = ttlSel.value; save(); toast("Saved", "Sensitive clips expire on your schedule"); };
  $("checkUpd").onclick = async () => { toast("Checking\u2026"); const r = await checkVersion(true); if (r === "same") toast("You\u2019re up to date"); };
  if (running) $("buildLabel").textContent = running;
  $("dupLabel").textContent = dupInfo;
}

// ---------- Auto-update ----------
let running = null, hadController = !!(navigator.serviceWorker && navigator.serviceWorker.controller), reloading = false;
function reloadNow() {
  if (reloading) return;
  const ti = $("textInput"); if (ti && ti.value.trim()) return; // never wipe a draft
  reloading = true; toast("Updating ClipDows\u2026", "New version installed"); setTimeout(() => location.reload(), 900);
}
async function checkVersion(manual) {
  try {
    const v = await (await fetch("/version.json", { cache: "no-store" })).json();
    if (!running) { running = v.build; const l = $("buildLabel"); if (l) l.textContent = v.build; return "init"; }
    if (v.build !== running) {
      const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
      if (reg) await reg.update();
      reloadNow(); return "new";
    }
    return "same";
  } catch { if (manual) toast("Offline", "Couldn\u2019t check right now"); return "err"; }
}
if (navigator.serviceWorker) navigator.serviceWorker.addEventListener("controllerchange", () => { if (hadController) reloadNow(); hadController = true; });

// ---------- Duplicate merge ----------
// The same clip can arrive twice (e.g. the PC re-uploading what it just received).
// Keep the earliest copy, hide later identical ones (within 90s, or same client_id).
const dupSeen = new Set(); let dupInfo = "none";
let lockedN = 0, livePins = 0;
function dedupe(items) {
  const core = dedupeCore(items);
  if (pins.size > 300) { const ids = new Set(core.map((i) => i.id)); pins = new Set([...pins].filter((id) => ids.has(id))); jset(PIN_KEY, [...pins]); }
  const H = lim().history, cap = H < 0 ? Infinity : H;
  lockedN = Math.max(0, core.length - cap);
  const shown = (lockedN ? core.slice(0, cap) : core).map((i) => ({ ...i, pinned: !!(i.pinned || pins.has(i.id)) }));
  livePins = shown.filter((i) => pins.has(i.id)).length;
  return shown;
}
function dedupeCore(items) {
  const kept = new Map(), drop = new Set();
  for (const it of [...items].sort((a, b) => (a.created_at || 0) - (b.created_at || 0))) {
    const key = it.type + "|" + hash(it.content || "");
    const k = kept.get(key);
    if (k && (Math.abs((it.created_at || 0) - (k.created_at || 0)) < 90000 || (it.client_id && it.client_id === k.client_id))) {
      drop.add(it.id);
      if (!dupSeen.has(it.id)) {
        dupSeen.add(it.id);
        dupInfo = dupSeen.size + " (last from " + ((it.source || "").startsWith("desktop:") ? "PC" : "phone") + ", " + (Math.round(((it.created_at || 0) - (k.created_at || 0)) / 100) / 10) + "s later)";
        const l = $("dupLabel"); if (l) l.textContent = dupInfo;
      }
    } else kept.set(key, it);
  }
  return items.filter((i) => !drop.has(i.id));
}

// =====================================================================
//  PLANS & TIERS — the phone follows the plan of the paired Windows app.
//  Limits come from ClipDowsApp.getPlan() (same table as the desktop's plan.js).
//  Plans can only be bought on the PC; every "Buy" here just points there.
// =====================================================================
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const plan = () => A().getPlan();
const lim = () => plan().limits;
const plural = (n, w) => n + " " + w + (n === 1 ? "" : "s");
const fmtDate = (ms) => new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const jget = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch { return d; } };
const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full or blocked */ } };
const rerender = () => { if (window.__rerender) window.__rerender(); };

const UPGRADE_MSG = {
  pinned: (m) => `The Free plan allows ${m} pinned items. Upgrade for unlimited pins.`,
  snippets: (m) => `Your plan allows ${m} snippets. Upgrade for more.`,
  stack: (m) => `The paste stack holds ${m} items on your plan. Upgrade for unlimited.`,
  syncImages: () => "Image sync is a Pro feature.",
  ocr: (m) => `The Free plan reads text from ${m} screenshots a month. Upgrade for unlimited.`,
  export: () => "Exporting your data is a Pro feature.",
  customExpiry: () => "Custom secret-expiry time is a Pro feature.",
  actions: () => "This instant action is a Pro feature.",
  variables: () => "Snippet variables are a Max feature.",
  triggers: () => "Snippet triggers are a Max feature.",
  timeMachine: () => "Time machine is a Max feature.",
};
function upgrade(feature, max) {
  const f = UPGRADE_MSG[feature];
  snack((f ? f(max) : "This feature needs a higher plan.") + " Upgrade from ClipDows on your PC.", "See plans", () => openPricing());
  buzz(10);
}
function openPricing() { if (window.__showTab) window.__showTab("settingsView"); setPane("pricing"); }

// ---------- Overlay / bottom-sheet helper ----------
let curOverlay = null;
function closeOverlay() { if (curOverlay) { curOverlay.remove(); curOverlay = null; } }
function openOverlay(build, sticky) {
  closeOverlay();
  const o = el("div", "cdx-overlay"), card = el("div", "cdx-sheet");
  o.appendChild(card); build(card);
  if (!sticky) o.addEventListener("click", (e) => { if (e.target === o) closeOverlay(); });
  document.body.appendChild(o); curOverlay = o;
  return card;
}
function sheet(title, rows) {
  openOverlay((c) => {
    c.appendChild(el("div", "cdx-grab")); c.appendChild(el("h3", "", title));
    const list = el("div", "cdx-list");
    rows.forEach((r) => {
      const b = el("button", "cdx-row" + (r.danger ? " danger" : ""));
      const t = el("span", "cdx-row-t"); t.appendChild(el("b", "", r.label)); if (r.sub) t.appendChild(el("small", "", r.sub));
      b.appendChild(t);
      if (r.tag) b.appendChild(el("em", "tier-tag", r.tag));
      b.onclick = () => { closeOverlay(); r.run && r.run(); };
      list.appendChild(b);
    });
    c.appendChild(list);
  });
}

// ---------- Plan chip + labels ----------
const TIER_NAME = { free: "Free", pro: "Pro", max: "Max" };
function planLabel(P) { return P.tier === "pro" && P.trial ? "Pro trial" : TIER_NAME[P.tier]; }
function paintChip() {
  const tb = document.querySelector(".topbar"); if (!tb) return;
  let c = $("planChip");
  if (!c) { c = el("button", "plan-chip"); c.id = "planChip"; c.onclick = openPricing; const cap = $("captureBtn"); tb.insertBefore(c, cap || null); }
  const P = plan(); c.textContent = planLabel(P); c.dataset.tier = P.tier;
  c.setAttribute("aria-label", "Your plan: " + planLabel(P));
}

// ---------- Local pins (phone-side; limits follow the plan) ----------
const PIN_KEY = "clipdows.pins";
let pins = new Set(jget(PIN_KEY, []));
const isPinned = (id) => pins.has(id);
function togglePin(item) {
  if (pins.has(item.id)) { pins.delete(item.id); livePins = Math.max(0, livePins - 1); }
  else {
    const max = lim().pinned;
    if (max >= 0 && livePins >= max) { upgrade("pinned", max); return; }
    pins.add(item.id); livePins++;
  }
  jset(PIN_KEY, [...pins]); buzz(10); rerender();
}

// ---------- Sensitive-data guard (port of the desktop's sensitive.js) ----------
const TOKEN_PATTERNS = [/\bAKIA[0-9A-Z]{16}\b/, /\bgh[pousr]_[A-Za-z0-9]{30,}\b/, /\bsk-[A-Za-z0-9_-]{20,}\b/, /\bsk_(live|test)_[A-Za-z0-9]{16,}\b/, /\brzp_(live|test)_[A-Za-z0-9]{10,}\b/, /\bAIza[0-9A-Za-z_-]{35}\b/, /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/, /\bBearer\s+[A-Za-z0-9._~+/-]{20,}/i];
function luhn(d) { let sum = 0, alt = false; for (let i = d.length - 1; i >= 0; i--) { let n = d.charCodeAt(i) - 48; if (alt) { n *= 2; if (n > 9) n -= 9; } sum += n; alt = !alt; } return sum % 10 === 0; }
function classify(text) {
  const t = String(text || "").trim(); if (!t || t.length > 4000) return null;
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(t)) return { kind: "key", ttl: 120000 };
  if (TOKEN_PATTERNS.some((re) => re.test(t))) return { kind: "token", ttl: 120000 };
  if (/^(?:\d[ -]?){13,19}$/.test(t)) { const d = t.replace(/[ -]/g, ""); if (d.length >= 13 && d.length <= 19 && luhn(d)) return { kind: "card", ttl: 120000 }; }
  if (/^[2-9]\d{3}\s?\d{4}\s?\d{4}$/.test(t) || /^[A-Z]{5}\d{4}[A-Z]$/.test(t)) return { kind: "id", ttl: 120000 };
  if (/^\d{6,8}$/.test(t)) return { kind: "otp", ttl: 60000 };
  if (t.length <= 160 && /\b(otp|one[- ]time|verification code|passcode|security code|login code)\b/i.test(t) && /\b\d{4,8}\b/.test(t)) return { kind: "otp", ttl: 60000 };
  if (/^\S{8,40}$/.test(t) && !/^(https?:|www\.)/i.test(t) && !/[\\/]{2}/.test(t)) {
    const n = [/[a-z]/, /[A-Z]/, /\d/, /[!@#$%^&*()+={}[\]:;"'<>,.?~`|\\/]/].filter((re) => re.test(t)).length;
    if (n === 4) return { kind: "password", ttl: 120000 };
  }
  return null;
}
// Optional: delete secrets after their expiry, exactly like the PC does. Pro/Max can pick a custom time.
const expiring = new Set();
function expireSecrets() {
  if (!S.secretExpire || !A() || !A().getPairing()) return;
  const now = Date.now(), override = lim().customExpiry ? (Number(S.secretTtl) || 0) * 1000 : 0;
  for (const it of A().getLatest()) {
    if (it.type === "image" || expiring.has(it.id)) continue;
    const c = classify(it.content); if (!c) continue;
    if (now - (it.created_at || 0) > (override || c.ttl)) { expiring.add(it.id); A().deleteItem(it.id).catch(() => expiring.delete(it.id)); }
  }
}
setInterval(expireSecrets, 5000);

// ---------- Instant actions (port of the desktop's actions.js: Free = JSON tools, Pro/Max = all) ----------
const TRACKING = /^(utm_[a-z]+|fbclid|gclid|dclid|msclkid|igshid|mc_eid|mc_cid|_hsenc|_hsmi|yclid|ref_src|si)$/i;
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
function parseColor(t) {
  const s = t.trim(); let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
  if (m) { let h = m[1]; if (h.length === 3) h = h.split("").map((c) => c + c).join(""); return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), kind: "hex" }; }
  m = /^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*(?:[,/]\s*[\d.]+%?\s*)?\)$/i.exec(s);
  if (m) return { r: clamp(+m[1], 0, 255), g: clamp(+m[2], 0, 255), b: clamp(+m[3], 0, 255), kind: "rgb" };
  m = /^hsla?\(\s*(\d{1,3}(?:\.\d+)?)\s*[, ]\s*(\d{1,3}(?:\.\d+)?)%\s*[, ]\s*(\d{1,3}(?:\.\d+)?)%\s*(?:[,/]\s*[\d.]+%?\s*)?\)$/i.exec(s);
  if (m) {
    const h = (+m[1] % 360) / 360, sat = clamp(+m[2], 0, 100) / 100, l = clamp(+m[3], 0, 100) / 100, q = l < 0.5 ? l * (1 + sat) : l + sat - l * sat, p = 2 * l - q;
    const f = (t0) => { let x = t0; if (x < 0) x += 1; if (x > 1) x -= 1; if (x < 1 / 6) return p + (q - p) * 6 * x; if (x < 1 / 2) return q; if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6; return p; };
    return { r: Math.round(f(h + 1 / 3) * 255), g: Math.round(f(h) * 255), b: Math.round(f(h - 1 / 3) * 255), kind: "hsl" };
  }
  return null;
}
const toHex = (c) => "#" + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
function toHsl(c) {
  const r = c.r / 255, g = c.g / 255, b = c.b / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  return `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}
const b64enc = (t) => { const bytes = new TextEncoder().encode(t); let bin = ""; bytes.forEach((b) => { bin += String.fromCharCode(b); }); return btoa(bin); };
const b64dec = (t) => { const bin = atob(t.trim()); const out = new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))); if (/[\u0000-\u0008\u000E-\u001F]/.test(out)) throw new Error("binary"); return out; };
const looksB64 = (t) => /^[A-Za-z0-9+/]{8,}={0,2}$/.test(t.trim()) && t.trim().length % 4 === 0;
function stripTracking(t) { const u = new URL(t.trim().startsWith("www.") ? "https://" + t.trim() : t.trim()); [...u.searchParams.keys()].forEach((k) => { if (TRACKING.test(k)) u.searchParams.delete(k); }); return u.toString(); }
const titleCase = (t) => t.toLowerCase().replace(/(^|[\s\-_/(])([a-z\u00C0-\u024F])/g, (m, a, b) => a + b.toUpperCase());
function actionsFor(content) {
  const text = String(content || ""), t = text.trim(), out = [];
  if (!t || t.length > 200000) return out;
  let json = null; if (/^[\[{]/.test(t)) { try { json = JSON.parse(t); } catch { json = null; } }
  if (json !== null) { out.push({ label: "Prettify JSON", full: false, run: () => JSON.stringify(json, null, 2) }); out.push({ label: "Minify JSON", full: false, run: () => JSON.stringify(json) }); }
  const col = parseColor(t);
  if (col) {
    if (col.kind !== "hex") out.push({ label: "HEX " + toHex(col), full: true, run: () => toHex(col) });
    if (col.kind !== "rgb") out.push({ label: "RGB", full: true, run: () => `rgb(${col.r}, ${col.g}, ${col.b})` });
    if (col.kind !== "hsl") out.push({ label: "HSL", full: true, run: () => toHsl(col) });
  }
  const isUrl = /^(https?:\/\/|www\.)\S+$/i.test(t);
  if (isUrl) { try { const base = t.startsWith("www.") ? "https://" + t : t; if (stripTracking(t) !== new URL(base).toString()) out.push({ label: "Strip tracking", full: true, run: () => stripTracking(t) }); } catch { /* not a URL */ } }
  if (json === null && !col && !isUrl) {
    if (looksB64(t)) { try { b64dec(t); out.push({ label: "Base64 decode", full: true, run: () => b64dec(t) }); } catch { /* not text */ } }
    if (/%[0-9a-f]{2}/i.test(t)) { try { decodeURIComponent(t); out.push({ label: "URL decode", full: true, run: () => decodeURIComponent(t) }); } catch { /* bad escape */ } }
    if (t.length <= 20000) {
      out.push({ label: "Base64 encode", full: true, run: () => b64enc(text) });
      if (/[\s&?=#%+/:]/.test(t) || /[^\x00-\x7F]/.test(t)) out.push({ label: "URL encode", full: true, run: () => encodeURIComponent(text) });
      out.push({ label: "UPPERCASE", full: true, run: () => text.toUpperCase() });
      out.push({ label: "lowercase", full: true, run: () => text.toLowerCase() });
      out.push({ label: "Title Case", full: true, run: () => titleCase(text) });
      out.push({ label: "Clean whitespace", full: true, run: () => text.replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim() });
      if (text.includes("\n")) out.push({ label: "Sort & dedupe lines", full: true, run: () => [...new Set(text.split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean))].sort((a, b) => a.localeCompare(b)).join("\n") });
    }
  }
  return out;
}
function openActions(item) {
  const list = actionsFor(item.content), full = lim().actions === "full";
  if (!list.length) { toast("No actions for this clip", "Try JSON, links, colours or plain text"); return; }
  sheet("Instant actions", list.map((a) => ({
    label: a.label, tag: a.full && !full ? "Pro" : "",
    run: async () => {
      if (a.full && !full) { upgrade("actions"); return; }
      try { await navigator.clipboard.writeText(a.run()); buzz(); toast("Copied", a.label + " \u2014 ready to paste"); }
      catch { toast("Couldn\u2019t run that action", "The clip may be malformed"); }
    },
  })));
}

// ---------- Search inside screenshots (OCR runs on this phone; language data downloads once) ----------
const OCR_KEY = "clipdows.ocr", USAGE_KEY = "clipdows.usage";
const ocrText = (id) => (jget(OCR_KEY, {})[id] || "");
function ocrQuota(delta) {
  const max = lim().ocrPerMonth; if (max < 0) return true;
  const month = new Date().toISOString().slice(0, 7); let u = jget(USAGE_KEY, {});
  if (u.month !== month) u = { month, ocr: 0 };
  if (delta > 0 && u.ocr >= max) return false;
  u.ocr = Math.max(0, u.ocr + delta); jset(USAGE_KEY, u); return true;
}
function ocrLeft() { const max = lim().ocrPerMonth; if (max < 0) return -1; const u = jget(USAGE_KEY, {}); return u.month === new Date().toISOString().slice(0, 7) ? Math.max(0, max - u.ocr) : max; }
function showOcrResult(text) {
  openOverlay((c) => {
    c.appendChild(el("div", "cdx-grab")); c.appendChild(el("h3", "", "Text in this image"));
    const box = el("div", "ocr-box", text); c.appendChild(box);
    const b = el("button", "primary-btn", "Copy text"); b.onclick = async () => { try { await navigator.clipboard.writeText(text); toast("Copied", "Text from the image"); } catch { toast("Copy failed"); } closeOverlay(); };
    c.appendChild(b);
  });
}
let ocrBusy = false;
async function readImageText(item) {
  const have = ocrText(item.id); if (have) { showOcrResult(have); return; }
  if (ocrBusy) return;
  if (!ocrQuota(1)) { upgrade("ocr", lim().ocrPerMonth); return; }
  ocrBusy = true; toast("Reading text\u2026", "The first scan downloads language data");
  try {
    const mod = await import("https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.esm.min.js");
    const T = mod.default || mod, worker = await T.createWorker("eng");
    const { data } = await worker.recognize(item.content); await worker.terminate();
    const text = (data.text || "").trim();
    if (!text) { ocrQuota(-1); toast("No text found", "That image doesn\u2019t seem to contain any"); return; }
    const all = jget(OCR_KEY, {}); all[item.id] = text.slice(0, 4000);
    const keys = Object.keys(all); if (keys.length > 200) delete all[keys[0]];
    jset(OCR_KEY, all); rerender(); showOcrResult(text);
  } catch { ocrQuota(-1); toast("Couldn\u2019t read that image", "Needs an internet connection the first time"); }
  finally { ocrBusy = false; }
}

// ---------- Snippets (kept on this phone; limits, variables and triggers follow the plan) ----------
const SNIP_KEY = "clipdows.snippets", STACK_KEY = "clipdows.stack";
const snips = () => jget(SNIP_KEY, []);
const TRIG_RE = /^[;/]?[a-z0-9-]{2,20}$/;
function expandVars(content, clip) {
  const n = new Date(), p2 = (v) => String(v).padStart(2, "0");
  const date = `${p2(n.getDate())}/${p2(n.getMonth() + 1)}/${n.getFullYear()}`, time = `${p2(n.getHours())}:${p2(n.getMinutes())}`;
  return String(content || "").replace(/\{datetime\}/gi, date + " " + time).replace(/\{date\}/gi, date).replace(/\{time\}/gi, time).replace(/\{clipboard\}/gi, () => clip || "").replace(/\{cursor\}/gi, "");
}
async function snippetText(sn) {
  if (!lim().variables) return sn.content;
  let clip = ""; if (/\{clipboard\}/i.test(sn.content)) { try { clip = await navigator.clipboard.readText(); } catch { /* blocked */ } }
  return expandVars(sn.content, clip);
}
async function copySnippet(sn) { try { await navigator.clipboard.writeText(await snippetText(sn)); buzz(); toast("Copied", sn.title); } catch { toast("Copy failed", "Allow clipboard access and try again"); } }
function saveSnippet(data) {
  const list = snips(), isNew = !data.id;
  if (!data.title.trim() || !data.content.trim()) { toast("Add a title and some text"); return false; }
  if (isNew) { const max = lim().snippets; if (max >= 0 && list.length >= max) { upgrade("snippets", max); return false; } }
  let trig = String(data.trigger || "").trim().toLowerCase();
  if (trig) {
    if (!lim().triggers) { upgrade("triggers"); return false; }
    if (!TRIG_RE.test(trig)) { toast("Trigger: 2\u201320 letters, numbers or dashes", "e.g. ;addr"); return false; }
    if (!/^[;/]/.test(trig)) trig = ";" + trig;
    if (list.some((x) => x.id !== data.id && x.trigger === trig)) { toast("That trigger is already used"); return false; }
  }
  if (isNew) list.unshift({ id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())), title: data.title.trim(), content: data.content, trigger: trig, created: Date.now() });
  else { const s = list.find((x) => x.id === data.id); if (s) { s.title = data.title.trim(); s.content = data.content; s.trigger = trig; } }
  jset(SNIP_KEY, list); renderTools(); return true;
}
function openSnippetEditor(sn) {
  const canTrig = lim().triggers;
  openOverlay((c) => {
    c.appendChild(el("div", "cdx-grab")); c.appendChild(el("h3", "", sn ? "Edit snippet" : "New snippet"));
    const t = el("input", "cdx-input"); t.placeholder = "Title, e.g. My address"; t.value = sn ? sn.title : ""; t.maxLength = 60;
    const b = el("textarea", "cdx-input"); b.rows = 5; b.placeholder = lim().variables ? "Text to paste. Variables: {date} {time} {datetime} {clipboard}" : "Text to paste"; b.value = sn ? sn.content : "";
    const g = el("input", "cdx-input"); g.placeholder = canTrig ? "Trigger, e.g. ;addr  (optional)" : "Trigger & variables \u2014 Max plan"; g.value = sn ? sn.trigger || "" : ""; g.maxLength = 21; g.disabled = !canTrig; g.autocapitalize = "off";
    const hint = el("div", "cdx-hint", canTrig ? "Type the trigger followed by a space in the send box and it expands to this snippet." : "Snippet triggers and variables unlock on the Max plan.");
    const save = el("button", "primary-btn", "Save snippet");
    save.onclick = () => { if (saveSnippet({ id: sn && sn.id, title: t.value, content: b.value, trigger: g.value })) closeOverlay(); };
    [t, b, g, hint, save].forEach((n) => c.appendChild(n));
  });
}
// Trigger expansion in the send box (Max): ";addr " -> snippet text
function bindTriggers() {
  const ti = $("textInput"); if (!ti) return;
  ti.addEventListener("input", () => {
    if (!lim().triggers) return;
    const m = /(^|\s)([;/][a-z0-9-]{2,20}) $/.exec(ti.value); if (!m) return;
    const sn = snips().find((x) => x.trigger === m[2]); if (!sn) return;
    snippetText(sn).then((txt) => { ti.value = ti.value.slice(0, ti.value.length - m[2].length - 1) + txt; ti.dispatchEvent(new Event("input", { bubbles: true })); buzz(8); });
  });
}

// ---------- Paste stack (first copied, first pasted — same order as the PC) ----------
const stackList = () => jget(STACK_KEY, []);
function addToStack(item) {
  if (item.type === "image" || item.type === "file") { toast("Only text can be queued on the phone"); return; }
  if (isSecret(item)) { toast("Sensitive clips aren\u2019t added to the stack"); return; }
  const list = stackList(), max = lim().stack;
  if (max >= 0 && list.length >= max) { upgrade("stack", max); return; }
  list.push({ id: item.id, type: item.type, content: item.content, preview: (item.preview || item.content || "").slice(0, 90) });
  jset(STACK_KEY, list); buzz(10); toast("Added to paste stack", plural(list.length, "item") + " queued"); renderTools();
}
async function copyNextFromStack() {
  const list = stackList(); if (!list.length) { toast("Paste stack is empty"); return; }
  const next = list.shift();
  try { await navigator.clipboard.writeText(next.content); } catch { toast("Copy failed", "Allow clipboard access and try again"); return; }
  jset(STACK_KEY, list); buzz();
  toast(list.length ? "Copied \u2014 paste it now" : "Paste stack finished", list.length ? plural(list.length, "more item") + " queued" : "Everything has been copied"); renderTools();
}

// ---------- Export (Pro/Max) ----------
function exportClips() {
  if (!lim().export) { upgrade("export"); return; }
  const out = A().getLatest().map(({ id, type, content, created_at }) => ({ id, type, content, pinned: isPinned(id), created_at }));
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: "application/json" }));
  a.download = `clipdows-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast("Export ready", plural(out.length, "clip"));
}

// ---------- Time machine (Max) ----------
function openTimeMachine() {
  if (!lim().timeMachine) { upgrade("timeMachine"); return; }
  const items = A().getLatest().filter((i) => i.type !== "snippet");
  const tmMax = Date.now(), tmMin = items.length ? Math.min(...items.map((i) => i.created_at || tmMax)) : tmMax - 86400000;
  const pad2 = (n) => String(n).padStart(2, "0");
  const toLocal = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
  openOverlay((c) => {
    c.classList.add("tall");
    c.appendChild(el("div", "cdx-grab")); c.appendChild(el("h3", "", "Time machine"));
    const sub = el("div", "cdx-hint"); c.appendChild(sub);
    const slider = el("input", "tm-slider"); slider.type = "range"; slider.min = 0; slider.max = 1000; slider.value = 1000;
    const when = el("input", "cdx-input"); when.type = "datetime-local"; when.value = toLocal(tmMax);
    const win = el("select", "cdx-input"); [[900000, "\u00B1 15 min"], [1800000, "\u00B1 30 min"], [3600000, "\u00B1 1 hour"], [10800000, "\u00B1 3 hours"], [43200000, "\u00B1 12 hours"]].forEach(([v, l]) => { const o = el("option", "", l); o.value = v; if (v === 1800000) o.selected = true; win.appendChild(o); });
    const list = el("div", "tm-list");
    const sel = () => { const v = new Date(when.value).getTime(); return Number.isFinite(v) ? v : tmMax; };
    const draw = () => {
      const at = sel(), w = +win.value;
      const hits = items.filter((i) => Math.abs((i.created_at || 0) - at) <= w).sort((a, b) => a.created_at - b.created_at).slice(0, 150);
      list.innerHTML = "";
      sub.textContent = items.length ? `${plural(hits.length, "clip")} around ${new Date(at).toLocaleString()}` : "Nothing synced yet.";
      hits.forEach((i) => {
        const row = el("div", "tm-item");
        row.appendChild(el("span", "tm-time", new Date(i.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })));
        row.appendChild(el("span", "tm-body", i.type === "image" ? "Image" : (isSecret(i) ? "Sensitive clip" : (i.preview || i.content || "").slice(0, 90))));
        if (i.type !== "image") { const b = el("button", "card-action", "Copy"); b.onclick = async () => { try { await navigator.clipboard.writeText(i.content); buzz(); toast("Copied", "Back on your clipboard"); } catch { toast("Copy failed"); } }; row.appendChild(b); }
        list.appendChild(row);
      });
      if (items.length && !hits.length) list.appendChild(el("div", "tm-empty", "Nothing copied in this window \u2014 widen it or move the slider."));
    };
    slider.oninput = () => { when.value = toLocal(tmMin + (tmMax - tmMin) * (+slider.value / 1000)); draw(); };
    when.onchange = () => { const span = tmMax - tmMin || 1; slider.value = Math.round(clamp((sel() - tmMin) / span, 0, 1) * 1000); draw(); };
    win.onchange = draw;
    [slider, when, win, list].forEach((n) => c.appendChild(n)); draw();
  });
}

// ---------- More menu on every clip ----------
function openMore(item) {
  const rows = [];
  rows.push({ label: isPinned(item.id) ? "Unpin" : "Pin to top", sub: lim().pinned < 0 ? "Unlimited pins on your plan" : `${livePins} of ${lim().pinned} pins used`, run: () => togglePin(item) });
  if (item.type !== "image" && item.type !== "file") {
    rows.push({ label: "Instant actions", sub: lim().actions === "full" ? "Transform this clip" : "JSON tools free \u2014 more on Pro", run: () => openActions(item) });
    rows.push({ label: "Add to paste stack", run: () => addToStack(item) });
    rows.push({ label: "Save as snippet", run: () => openSnippetEditor({ title: (item.preview || item.content || "").slice(0, 40), content: item.content, trigger: "" }) });
  } else if (item.type === "image") {
    const left = ocrLeft();
    rows.push({ label: ocrText(item.id) ? "Show text in image" : "Read text in image", sub: left < 0 ? "Unlimited on your plan" : `${left} scan${left === 1 ? "" : "s"} left this month`, run: () => readImageText(item) });
  }
  sheet("Clip options", rows);
}

// ---------- Tools tab (Snippets, Paste stack, Time machine) ----------
function renderTools() {
  const m = $("toolsMount"); if (!m) return;
  const L = lim(), list = snips(), stack = stackList();
  const cnt = (n, max) => max < 0 ? `${n} \u00B7 unlimited` : `${n} / ${max}`;
  m.innerHTML = `
    <div class="settings-group"><h4>Snippets<span class="cnt">${cnt(list.length, L.snippets)}</span></h4>
      ${list.map((s) => `<div class="settings-row snip-row" data-id="${esc(s.id)}"><span><span class="label">${esc(s.title)}${s.trigger ? `<em class="trig">${esc(s.trigger)}</em>` : ""}</span><small>${esc(s.content.replace(/\s+/g, " ").slice(0, 80))}</small></span><span class="snip-btns"><button class="card-action" data-a="copy">Copy</button><button class="card-action icon" data-a="edit" aria-label="Edit">\u270E</button><button class="card-action icon danger" data-a="del" aria-label="Delete">\u2715</button></span></div>`).join("")}
      <div class="settings-row tap" id="snipNew"><span><span class="label">New snippet</span><small>${L.triggers ? "Triggers and variables are on" : "Triggers &amp; variables unlock on Max"}</small></span><span class="value">+</span></div>
    </div>
    <div class="settings-group"><h4>Paste stack<span class="cnt">${cnt(stack.length, L.stack)}</span></h4>
      ${stack.length ? stack.map((s, i) => `<div class="settings-row"><span><span class="label">${i + 1}. ${esc(s.preview)}</span></span></div>`).join("") : `<div class="settings-row"><span><small style="max-width:none">Queue clips with \u22EF \u203A Add to paste stack, then copy them one by one in order.</small></span></div>`}
      <div class="settings-row stack-btns"><button class="card-action" id="stackNext" ${stack.length ? "" : "disabled"}>Copy next</button><button class="card-action danger" id="stackClear" ${stack.length ? "" : "disabled"}>Clear</button></div>
    </div>
    <div class="settings-group"><h4>Time machine${L.timeMachine ? "" : '<em class="tier-tag">Max</em>'}</h4>
      <div class="settings-row tap" id="tmOpen"><span><span class="label">Browse clips by time</span><small>Jump back to what you copied at any moment</small></span><span class="value">\u203A</span></div>
    </div>`;
  m.querySelector("#snipNew").onclick = () => openSnippetEditor(null);
  m.querySelector("#tmOpen").onclick = openTimeMachine;
  const nx = m.querySelector("#stackNext"); if (nx) nx.onclick = copyNextFromStack;
  const cl = m.querySelector("#stackClear"); if (cl) cl.onclick = () => { jset(STACK_KEY, []); renderTools(); toast("Paste stack cleared"); };
  m.querySelectorAll(".snip-row").forEach((row) => {
    const sn = snips().find((x) => x.id === row.dataset.id); if (!sn) return;
    row.querySelector('[data-a="copy"]').onclick = () => copySnippet(sn);
    row.querySelector('[data-a="edit"]').onclick = () => openSnippetEditor(sn);
    row.querySelector('[data-a="del"]').onclick = () => { if (!confirm("Delete this snippet?")) return; jset(SNIP_KEY, snips().filter((x) => x.id !== sn.id)); renderTools(); };
  });
}

// =====================================================================
//  PRICING (Settings → Pricing) — same plans and prices as the Windows app.
//  "Buy Now" only ever explains where to buy: on the PC.
// =====================================================================
const PLAN_ORDER = ["free", "pro", "max"];
const PLAN_DEFS = {
  free: { name: "Free", price: 0, tag: "Everything you need to get started.", feats: ["100 clips of history", "5 pins and 10 snippets", "1 linked phone", "Sensitive-data guard", "Profile photo sync and ClipDows Guide", "AI Focus preview", "Basic instant actions"] },
  pro: { name: "Pro", price: 99, tag: "For people who live in their clipboard.", feats: ["1,000 clips of history", "Unlimited pins and paste stack", "3 linked phones with image sync", "AI Focus with up to 8 built-in or custom topics", "Encrypted Focus Review sync · 24-hour reminder · 48-hour expiry", "Profile photo sync and guided tour on Windows and PWA", "All instant actions and data export", "Unlimited screenshot search"] },
  max: { name: "Max", price: 199, tag: "Every power feature, with the highest limits.", feats: ["Everything in Pro", "Unlimited history and snippets", "10 linked phones, 1,000 synced clips", "AI Focus with up to 16 built-in or custom topics", "Encrypted Focus Review sync · 24-hour reminder · 48-hour expiry", "Profile photo sync and guided tour on Windows and PWA", "Snippet triggers, variables, and Time Machine"] },
};
const PLAN_COMPARE = [
  { group: "History & storage", rows: [["Clipboard history", "100 clips", "1,000 clips", "Unlimited"], ["Pinned items", "5", "Unlimited", "Unlimited"], ["Snippets", "10", "100", "Unlimited"], ["Paste stack", "5 items", "Unlimited", "Unlimited"], ["Search inside screenshots", "5 / month", "Unlimited", "Unlimited"]] },
  { group: "Sync & devices", rows: [["Linked phones", "1", "3", "10"], ["Synced clips", "25", "200", "1,000"], ["Image sync", false, true, true]] },
  { group: "Productivity", rows: [["Instant actions", "Basic", "All actions", "All actions"], ["App filters and ignored apps", false, true, true], ["Custom secret expiry", false, true, true], ["Export your data", false, true, true]] },
  { group: "Focus & account", rows: [
    ["AI Focus mode and classification", "Preview", "On-device Windows classification", "On-device Windows classification"],
    ["AI Focus topics", "Preview", "Up to 8 · built-in or custom", "Up to 16 · built-in or custom"],
    ["Focus Review", "Preview", "Encrypted cross-device sync", "Encrypted cross-device sync"],
    ["Review reminder and automatic expiry", false, "Reminder at 24h · expires at 48h", "Reminder at 24h · expires at 48h"],
    ["Profile photo upload, circle crop, and account sync", true, true, true],
    ["ClipDows Guide · automatic tour and replay in Settings", true, true, true] ] },
  { group: "Max tools", rows: [["Snippet variables", false, false, true], ["Snippet triggers", false, false, true], ["Time machine", false, false, true]] },
];
function buyOnPc(tier) {
  openOverlay((c) => {
    c.classList.add("center");
    const ico = el("div", "buy-ico", "\uD83D\uDDA5"); c.appendChild(ico);
    c.appendChild(el("h3", "", "Open on your Windows PC"));
    c.appendChild(el("p", "buy-msg", `Plans can\u2019t be bought on the phone. Open ClipDows on your Windows PC, go to Settings \u203A Pricing and choose ${PLAN_DEFS[tier].name} there. This phone unlocks it automatically as soon as the payment goes through.`));
    const b = el("button", "primary-btn", "Got it"); b.onclick = closeOverlay; c.appendChild(b);
  });
}
function renderPricing() {
  const m = $("pricingMount"); if (!m) return;
  const P = plan(), cur = P.tier, trial = P.trial, curIdx = PLAN_ORDER.indexOf(cur);
  const status = `Current plan: <b>${esc(planLabel(P))}</b>` + (trial ? ` &middot; ${plural(P.trialDaysLeft, "day")} left` : P.paid ? ` &middot; active until ${fmtDate(P.paidUntil)}` : "");
  const hi = (t) => (t === cur && !(trial && t === "pro") ? "cur" : "");
  m.innerHTML = `
    <div class="price-status">${status}</div>
    ${P.known ? "" : '<div class="price-note">Waiting for ClipDows on your PC to share your plan. Open the Windows app (latest version) once while online.</div>'}
    <div class="plan-list">${PLAN_ORDER.map((t, i) => {
      const d = PLAN_DEFS[t], isCur = t === cur && !(trial && t === "pro"), isTrial = trial && t === "pro";
      let flag = t === "pro" ? '<span class="plan-flag">Most popular</span>' : "";
      if (isCur) flag = '<span class="plan-flag cur">Your plan</span>';
      if (isTrial) flag = `<span class="plan-flag">Trial &middot; ${plural(P.trialDaysLeft, "day")} left</span>`;
      let btn;
      if (isCur) btn = '<button class="plan-btn cur" disabled>\u2713 Current</button>';
      else if (i < curIdx || (trial && t === "free")) btn = '<button class="plan-btn dim" disabled>Included</button>';
      else btn = `<button class="plan-btn ${t === "max" ? "gold" : "buy"}" data-buy="${t}">Buy Now<span class="pb-price"> &middot; \u20B9${d.price} / month</span></button>`;
      const renew = isCur && P.paid && t !== "free" ? `<button class="plan-renew" data-buy="${t}">Extend by 30 days &middot; \u20B9${d.price}</button>` : "";
      return `<article class="plan-card ${t} ${t === "pro" ? "featured" : ""}">${flag}
        <div class="plan-name">${d.name}</div><div class="plan-tag">${d.tag}</div>
        <div class="plan-price"><span class="plan-amt"><small>\u20B9</small>${d.price}</span><span class="plan-per">${d.price ? "/ month" : "forever"}</span></div>
        <ul class="plan-feats">${d.feats.map((f) => `<li>${f}</li>`).join("")}</ul>${btn}${renew}</article>`;
    }).join("")}</div>
    <div class="cmp">
      <div class="cmp-row cmp-head"><span>Features</span>${PLAN_ORDER.map((t) => `<span class="${hi(t)}">${PLAN_DEFS[t].name}</span>`).join("")}</div>
      ${PLAN_COMPARE.map((g) => `<div class="cmp-row cmp-group"><span>${g.group}</span></div>` + g.rows.map((r) => `<div class="cmp-row"><span>${r[0]}</span>${[1, 2, 3].map((k) => { const v = r[k]; const cls = PLAN_ORDER[k - 1] === cur ? "cur" : ""; return `<span class="${cls}">${v === true ? '<i class="ck">\u2713</i>' : v === false ? '<i class="no">\u2014</i>' : v}</span>`; }).join("")}</div>`).join("")).join("")}
    </div>
    <div class="price-foot">Plans are bought and managed in ClipDows on your Windows PC. App filters and ignored apps apply on your PC.</div>`;
  m.onclick = (e) => { const b = e.target.closest("[data-buy]"); if (b) buyOnPc(b.dataset.buy); };
}
let pane = "general";
function setPane(p) {
  pane = p;
  const g = $("generalPane"), pr = $("pricingPane"); if (g) g.hidden = p !== "general"; if (pr) pr.hidden = p !== "pricing";
  document.querySelectorAll("#settingsSeg button").forEach((b) => b.classList.toggle("on", b.dataset.pane === p));
  if (p === "pricing") renderPricing();
}

// ---------- Unlock (end-to-end encryption passphrase, set on the PC) ----------
function hideLockBanner() { const b = $("lockBanner"); if (b) b.remove(); }
function showLockBanner(done) {
  if ($("lockBanner")) return;
  const b = el("div", "lock-banner"); b.id = "lockBanner";
  b.appendChild(el("span", "", "\uD83D\uDD12 Locked \u2014 enter your passphrase to read clips"));
  const btn = el("button", "", "Unlock"); btn.onclick = () => openUnlock(done); b.appendChild(btn);
  const feed = $("feedView"); if (feed) feed.insertBefore(b, feed.firstChild);
}
function openUnlock(done) {
  openOverlay((c) => {
    c.classList.add("center");
    c.appendChild(el("div", "buy-ico", "\uD83D\uDD10"));
    c.appendChild(el("h3", "", "Unlock ClipDows"));
    c.appendChild(el("p", "buy-msg", "Your clips are end-to-end encrypted. Enter the passphrase you created in ClipDows on your PC. It stays on this phone and is never uploaded."));
    const inp = el("input", "cdx-input"); inp.type = "password"; inp.placeholder = "Passphrase"; inp.autocomplete = "current-password";
    const err = el("div", "cdx-err");
    const go = el("button", "primary-btn", "Unlock"), later = el("button", "install-skip", "Not now");
    const run = async () => {
      if (go.disabled || !inp.value) return; go.disabled = true; go.textContent = "Unlocking\u2026"; err.textContent = "";
      try { await A().unlockWithPassphrase(inp.value); closeOverlay(); hideLockBanner(); buzz(); toast("Unlocked", "Your clips are readable again"); if (done) done(); }
      catch (e) { err.textContent = e.message || "Couldn\u2019t unlock."; go.disabled = false; go.textContent = "Unlock"; }
    };
    go.onclick = run; inp.onkeydown = (e) => { if (e.key === "Enter") run(); };
    later.onclick = () => { closeOverlay(); showLockBanner(done); };
    [inp, err, go, later].forEach((n) => c.appendChild(n));
    setTimeout(() => inp.focus(), 250);
  }, true);
}
function needUnlock(cs, done) {
  if (cs.state === "blocked") { toast("Can\u2019t reach your encryption settings", cs.error === "rules" ? "Firestore rules need the ClipDows update" : "Check your connection"); return; }
  if (cs.state === "locked") { showLockBanner(done); openUnlock(done); }
}
let relocking = false;
window.addEventListener("clipdows:locked", async (e) => {
  if (relocking || !A() || !A().getPairing()) return; relocking = true;
  try {
    const hadKey = e.detail && e.detail.hadKey, cs = await A().initCrypto();
    if (cs.state === "locked") { showLockBanner(() => window.__restartWatch && window.__restartWatch()); if (hadKey) openUnlock(() => window.__restartWatch && window.__restartWatch()); }
    else if (cs.state === "ready" && !hadKey && window.__restartWatch) window.__restartWatch();
  } finally { setTimeout(() => { relocking = false; }, 4000); }
});

// ---------- React to plan changes ----------
let lastCap = null;
function onPlan() {
  paintChip(); renderPrefs(); renderTools();
  if (pane === "pricing") renderPricing();
  const hr = $("histRow"); if (hr) hr.textContent = `Last ${lim().syncItems.toLocaleString("en-IN")} synced clips`;
  const cap = lim().syncItems;
  if (lastCap !== null && cap !== lastCap && window.__restartWatch) window.__restartWatch(); else rerender();
  lastCap = cap;
}

// ---------- Boot ----------
applyTheme();
window.CDX = { enhanceCard, onFeed, capture, dedupe, needUnlock, openPricing, applyFilter };
window.addEventListener("DOMContentLoaded", () => {
  lastCap = lim().syncItems;
  buildToolbar(); paintChip(); renderPrefs(); renderTools(); checkVersion(); bindTriggers();
  document.querySelectorAll("#settingsSeg button").forEach((b) => { b.onclick = () => { setPane(b.dataset.pane); buzz(6); }; });
  window.addEventListener("clipdows:plan", onPlan);
  const cb = $("captureBtn"); if (cb) cb.onclick = () => capture(true);
  const qrClose = $("qrCloseBtn"); if (qrClose) qrClose.onclick = closeQr;
  const qrOverlay = $("qrOverlay"); if (qrOverlay) qrOverlay.addEventListener("click", (e) => { if (e.target === qrOverlay) closeQr(); });
  window.clipdowsWaitReady().then(() => {
    setTimeout(capture, 900);
    // Foreground pushes: the OS notification is suppressed while the tab is
    // focused, so surface it as an in-app toast instead.
    A().onForegroundPush((payload) => {
      const n = payload.notification || payload.data || {};
      toast(n.title || "New from your PC", n.body || "");
      buzz(18);
    });
  }).catch(() => {});
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { capture(); checkVersion(); } });
  window.addEventListener("focus", () => capture());
  setInterval(checkVersion, 5 * 60 * 1000);
});