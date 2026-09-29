// privacy-note.js — friendly privacy banner shown when the app opens (same file used by the PWA and the Windows app).
(function () {
  if (window.__cdPrivacy) return; window.__cdPrivacy = true;
  var css = document.createElement("style");
  css.textContent =
    "#cdPriv{position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 10px);transform:translate(-50%,-140%);width:min(92vw,440px);z-index:99999;" +
    "display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border-radius:18px;box-shadow:0 12px 40px rgba(0,0,0,.28);" +
    "background:var(--bg-soft,#fff);color:var(--text,#1b1811);border:1px solid rgba(127,127,127,.25);font:13px/1.45 system-ui,sans-serif;" +
    "transition:transform .5s cubic-bezier(.2,.9,.3,1.1),opacity .4s;opacity:0}" +
    "#cdPriv.show{transform:translate(-50%,0);opacity:1}#cdPriv b{display:block;font-size:14px;margin-bottom:2px}" +
    "#cdPriv .ic{font-size:22px;line-height:1}#cdPriv button{margin-left:auto;background:none;border:0;color:inherit;opacity:.55;font-size:18px;cursor:pointer;line-height:1;padding:0 2px}";
  document.head.appendChild(css);
  var el = document.createElement("div"); el.id = "cdPriv"; el.setAttribute("role", "status");
  el.innerHTML = '<span class="ic">\uD83D\uDD12</span><div><b>Your clips stay private</b>' +
    'Everything you copy is end-to-end encrypted with your passphrase before it leaves your device. ' +
    'ClipDows can\u2019t read it, never analyses it and never sells it. Share freely.</div><button aria-label="Close">\u00D7</button>';
  function hide() { el.classList.remove("show"); setTimeout(function () { el.remove(); }, 600); }
  el.querySelector("button").onclick = hide;
  function start() { document.body.appendChild(el); setTimeout(function () { el.classList.add("show"); }, 900); setTimeout(hide, 13000); }
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();
