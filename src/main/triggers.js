// System-wide snippet triggers: type ";addr" anywhere and it expands in place.
// Needs a global key listener (uiohook-napi). Started only while at least one trigger exists
// and the plan allows it. Some antivirus tools are wary of any app that listens to keystrokes.
const { clipboard } = require('electron');
const db = require('./db');
const plan = require('./plan');
const snippets = require('./snippets');

let deps = null;               // { watcher, autoPaste }
let hook = null, Key = null;   // null = not tried, false = unavailable
let started = false, listening = false, injecting = false;
let buffer = '';
let list = [];
let keyMap = null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function init(d) { deps = d; }

function loadHook() {
  if (hook !== null) return !!hook;
  try {
    const m = require('uiohook-napi');
    hook = m.uIOhook; Key = m.UiohookKey;
    keyMap = new Map();
    for (let c = 97; c <= 122; c++) keyMap.set(Key[String.fromCharCode(c).toUpperCase()], String.fromCharCode(c));
    for (let d = 0; d <= 9; d++) keyMap.set(Key[d], String(d));
    keyMap.set(Key.Semicolon, ';'); keyMap.set(Key.Slash, '/'); keyMap.set(Key.Minus, '-');
  } catch (err) {
    console.warn('[triggers] uiohook-napi not available — run `npm i uiohook-napi`.', err.message);
    hook = false;
  }
  return !!hook;
}

function activeTriggers() {
  if (!db.hasSession() || !plan.limits().triggers) return [];
  return db.getItems({ type: 'snippet', limit: 100000 })
    .filter((i) => i.trigger)
    .map((i) => ({ trigger: String(i.trigger).toLowerCase(), item: i }));
}

/** True if `t` would clash with an existing trigger (same, or one is a prefix of the other). */
function conflicts(t) {
  const x = String(t).toLowerCase();
  return activeTriggers().some((a) => a.trigger.startsWith(x) || x.startsWith(a.trigger));
}

function onKey(e) {
  if (injecting) return;
  if (e.ctrlKey || e.altKey || e.metaKey) { buffer = ''; return; }
  if (e.keycode === Key.Backspace) { buffer = buffer.slice(0, -1); return; }
  const ch = keyMap.get(e.keycode);
  if (!ch || (e.shiftKey && (ch === ';' || ch === '/' || ch === '-'))) { buffer = ''; return; }
  buffer = (buffer + ch).slice(-24);
  const hit = list.find((x) => buffer.endsWith(x.trigger));
  if (hit) fire(hit);
}

async function fire({ trigger, item }) {
  injecting = true; buffer = '';
  try {
    await sleep(70); // let the app receive the last typed character first
    const prevText = clipboard.readText();
    const prevImg = clipboard.readImage();
    const ex = snippets.expand(item.content, prevText);
    deps.watcher.writeToClipboard({ type: 'text', content: ex.text });
    await deps.autoPaste.backspace(trigger.length);
    await deps.autoPaste.simulatePaste();
    if (ex.cursorBack) await deps.autoPaste.moveLeft(ex.cursorBack);
    await sleep(250);
    // give the user their own clipboard back
    if (!prevImg.isEmpty()) deps.watcher.writeToClipboard({ type: 'image', content: prevImg.toDataURL() });
    else if (prevText) deps.watcher.writeToClipboard({ type: 'text', content: prevText });
    else clipboard.clear();
  } catch (err) {
    console.warn('[triggers] expansion failed:', err.message);
  } finally {
    setTimeout(() => { injecting = false; buffer = ''; }, 150);
  }
}

/** Call whenever snippets, the session or the plan change. */
function refresh() {
  list = activeTriggers().sort((a, b) => b.trigger.length - a.trigger.length);
  const need = list.length > 0;
  if (need && !started && loadHook()) {
    if (!listening) { hook.on('keydown', onKey); listening = true; }
    try { hook.start(); started = true; } catch (err) { console.warn('[triggers] could not start:', err.message); }
  } else if (!need && started) {
    try { hook.stop(); } catch { /* ignore */ }
    started = false; buffer = '';
  }
}

function stop() { if (started && hook) { try { hook.stop(); } catch { /* ignore */ } started = false; } }

module.exports = { init, refresh, stop, conflicts };
