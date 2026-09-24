// ---------- helpers & icons ----------
const $ = (id) => document.getElementById(id);

const PATHS = {
  layers: '<path d="M12 3 3 8l9 5 9-5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  pin: '<path d="M9 4h6l-1 5 3 3H7l3-3-1-5z"/><path d="M12 12v8"/>',
  text: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-8 8"/>',
  code: '<path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 5l-4 14"/>',
  file: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/>',
  snippet: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
  paste: '<path d="M9 4h6v3H9zM8 5.5H6a2 2 0 0 0-2 2V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5a2 2 0 0 0-2-2h-2"/><path d="M12 11v6M9.5 14.5 12 17l2.5-2.5"/>',
  edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6"/>',
  back: '<path d="m15 5-7 7 7 7"/>',
  checksq: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="m8 12.5 3 3 5-6"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2.5"/><path d="M8 20h8M12 16v4"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  cloud: '<path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 10.5 3.75 3.75 0 0 1 17.5 18z"/>',
  keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
  shield: '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/><path d="m9 12 2 2 4-4"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-1.8 0-.6-.3-1-.6-1.4-.3-.4-.4-.8-.4-1.3 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.3 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7" r="1"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14"/>',
  logout: '<path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M15 8l4 4-4 4M19 12H9"/>',
  zap: '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>',
};
const svg = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${PATHS[n] || ''}</svg>`;
function hydrate(root = document) { root.querySelectorAll('i[data-i]').forEach((el) => { el.innerHTML = svg(el.dataset.i); }); }
hydrate();

function setBtn(btn, icon, label) { btn.innerHTML = `<i data-i="${icon}"></i><span>${label}</span>`; hydrate(btn); }

// ---------- Auth (Firebase) ----------
const onboarding = $('onboarding');
const appRoot = $('appRoot');
const continueGoogle = $('continueGoogle');
const authForm = $('authForm');
const authName = $('authName');
const authEmail = $('authEmail');
const authPassword = $('authPassword');
const authError = $('authError');
const authSubmit = $('authSubmit');
const authForgot = $('authForgot');
const authToggle = $('authToggle');
const signOutBtn = $('signOutBtn');
let signupMode = false;

function showAuthError(msg) { authError.textContent = msg; authError.hidden = !msg; }

function friendlyAuthError(err) {
  switch (err && err.code) {
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/missing-password': return 'Please enter your password.';
    case 'auth/weak-password': return 'Password must be at least 6 characters.';
    case 'auth/email-already-in-use': return 'An account with this email already exists. Try signing in.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'Incorrect email or password.';
    case 'auth/too-many-requests': return 'Too many attempts. Please wait a bit and try again.';
    case 'auth/network-request-failed': return 'Network error. Check your internet connection.';
    case 'auth/operation-not-allowed': return 'Email/Password sign-in is not enabled in the Firebase console yet.';
    default: return (err && err.message) || 'Something went wrong. Please try again.';
  }
}

function initialsFor(name, email) {
  const src = (name || email || '?').trim();
  const parts = src.split(/[\s@._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : src.slice(0, 2);
  return letters.toUpperCase();
}

authToggle.addEventListener('click', () => {
  signupMode = !signupMode;
  authName.hidden = !signupMode;
  authForgot.hidden = signupMode;
  authSubmit.textContent = signupMode ? 'Create account' : 'Sign in';
  authToggle.textContent = signupMode ? 'Already have an account? Sign in' : 'Create a new account';
  authPassword.autocomplete = signupMode ? 'new-password' : 'current-password';
  showAuthError('');
});

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!window.clipAuth) { showAuthError('Auth is still loading. Check your internet connection and try again.'); return; }
  const email = authEmail.value.trim();
  const password = authPassword.value;
  if (!email) { showAuthError('Please enter your email.'); return; }
  if (!password) { showAuthError('Please enter your password.'); return; }
  showAuthError('');
  authSubmit.disabled = true;
  const label = authSubmit.textContent;
  authSubmit.textContent = 'Please wait…';
  try {
    if (signupMode) await window.clipAuth.signUp(authName.value.trim(), email, password);
    else await window.clipAuth.signIn(email, password);
    authPassword.value = '';
  } catch (err) {
    showAuthError(friendlyAuthError(err));
  } finally {
    authSubmit.disabled = false;
    authSubmit.textContent = label;
  }
});

authForgot.addEventListener('click', async () => {
  const email = authEmail.value.trim();
  if (!email) { showAuthError('Enter your email above, then click "Forgot password?".'); return; }
  try {
    await window.clipAuth.resetPassword(email);
    showAuthError('');
    showToast('Password reset email sent', email);
  } catch (err) { showAuthError(friendlyAuthError(err)); }
});

let googleBusy = false;
const googleLabel = continueGoogle.innerHTML;
continueGoogle.addEventListener('click', async () => {
  if (googleBusy) { window.clipdows.googleCancel(); return; } // second click = cancel
  if (!window.clipAuth) { showAuthError('Auth is still loading. Check your internet connection and try again.'); return; }
  googleBusy = true;
  showAuthError('');
  continueGoogle.innerHTML = '<span class="oauth-dot">G</span> Waiting for browser… (click to cancel)';
  try {
    const r = await window.clipdows.googleSignIn();
    console.log('[google-signin] browser step:', { ok: r.ok, cancelled: r.cancelled, error: r.error });
    if (r.ok) {
      continueGoogle.innerHTML = '<span class="oauth-dot">G</span> Signing you in…';
      const cred = await window.clipAuth.signInWithGoogle(r.idToken, r.accessToken);
      console.log('[google-signin] Firebase signed in:', cred.user.email);
      applyUser({ uid: cred.user.uid, email: cred.user.email, displayName: cred.user.displayName || '' });
    } else if (!r.cancelled) showAuthError(r.error || 'Google sign-in failed. Please try again.');
  } catch (err) {
    console.error('[google-signin] Firebase rejected the Google token:', err);
    const code = (err && err.code) || 'unknown';
    const hint = /invalid-credential|idp|audience/i.test(code + ' ' + (err && err.message))
      ? ' In Firebase → Authentication → Sign-in method → Google, add your Desktop client ID under "Safelist client IDs from external projects".'
      : '';
    showAuthError(`Google sign-in failed (${code}).${hint}`);
  } finally {
    googleBusy = false;
    continueGoogle.innerHTML = googleLabel;
  }
});

signOutBtn.addEventListener('click', async () => {
  settingsModal.hidden = true;
  try { await window.clipAuth.signOut(); } catch (err) { console.error(err); }
});

async function applyUser(user) {
  if (user) {
    const name = user.displayName || (user.email || '').split('@')[0];
    const initials = initialsFor(user.displayName, user.email);
    $('userName').textContent = $('sUserName').textContent = name;
    $('userEmail').textContent = $('sUserEmail').textContent = user.email || '';
    $('userAvatar').textContent = $('sUserAvatar').textContent = initials;
    // Point the local database at THIS account's private file before anything is shown.
    await window.clipdows.setSession(user.uid);
    resetViewState();
    onboarding.hidden = true;
    appRoot.hidden = false;
    refresh();
    if (window.clipSync) { window.clipSync.startClipSync(user.uid); loadDevices(); }
  } else {
    appRoot.hidden = true;
    onboarding.hidden = false;
    showAuthError('');
    if (window.clipSync) window.clipSync.stopClipSync();
    await window.clipdows.setSession(null); // locks the local database
    resetViewState();
  }
}

// Wipes everything the previous account left in memory / on screen.
function resetViewState() {
  allItems = []; pinnedAll = []; trashItems = []; trashCount = 0; knownIds = null;
  selected.clear(); selectMode = false; lastClickedId = null;
  document.body.classList.remove('selecting');
  selectModeBtn.classList.remove('active');
  selBar.hidden = true;
  closeDetail();
  itemsGrid.innerHTML = ''; pinnedGrid.innerHTML = '';
  searchInput.value = ''; currentSearch = ''; currentType = 'all';
  navGroup.querySelectorAll('.nav-item').forEach((n) => n.classList.toggle('active', n.dataset.type === 'all'));
  chipsEl.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c.dataset.type === 'all'));
  document.querySelectorAll('[id^="count-"]').forEach((el) => { el.textContent = '0'; });
  devicesBody.querySelectorAll('.device-row:not([data-device="this"])').forEach((r) => r.remove());
  [settingsModal, devicesModal, snippetModal, confirmModal].forEach((m) => { m.hidden = true; });
  $('toast').hidden = true;
}
window.addEventListener('clipauth:state', (e) => applyUser(e.detail));

window.addEventListener('unhandledrejection', (e) => {
  console.error('[unhandled]', e.reason);
  if (!onboarding.hidden) showAuthError('Unexpected error: ' + ((e.reason && e.reason.message) || e.reason));
});
window.addEventListener('error', (e) => {
  console.error('[error]', e.error || e.message);
  if (!onboarding.hidden) showAuthError('Unexpected error: ' + e.message);
});

// ---------- refs & state ----------
const navGroup = $('navGroup'), chipsEl = $('chips');
const searchInput = $('searchInput'), sortSelect = $('sortSelect');
const itemsGrid = $('itemsGrid'), pinnedGrid = $('pinnedGrid'), pinnedSection = $('pinnedSection');
const sectionTitle = $('sectionTitle'), sectionCount = $('sectionCount'), emptyState = $('emptyState');
const emptyTrashBtn = $('emptyTrashBtn'), content = $('content');
const gridViewBtn = $('gridViewBtn'), listViewBtn = $('listViewBtn');
const selectModeBtn = $('selectModeBtn'), selBar = $('selBar'), selCount = $('selCount');
const selAll = $('selAll'), selPin = $('selPin'), selRestore = $('selRestore'), selDelete = $('selDelete');
const detailPanel = $('detailPanel'), detailBody = $('detailBody'), detailCount = $('detailCount');
const detailPin = $('detailPin'), detailEdit = $('detailEdit'), detailShare = $('detailShare');
const detailTrash = $('detailTrash'), detailPaste = $('detailPaste');
const tagChips = $('tagChips'), tagAddBtn = $('tagAddBtn'), tagInput = $('tagInput');
const settingsModal = $('settingsModal'), accentRow = $('accentRow');
const devicesModal = $('devicesModal'), snippetModal = $('snippetModal'), confirmModal = $('confirmModal');

let currentType = 'all', currentSearch = '', currentSort = 'newest';
let allItems = [], pinnedAll = [], trashItems = [], trashCount = 0;
let selectedItem = null;
let selectMode = false;
const selected = new Set();
let lastClickedId = null;
let visibleIds = [];
let knownIds = null;

const TYPE_LABEL = { text: 'Text', link: 'Link', image: 'Image', code: 'Code', file: 'File', snippet: 'Snippet' };
const TITLES = { all: 'Recent Items', pinned: 'Pinned Items', trash: 'Trash', text: 'Text', link: 'Links', image: 'Images', code: 'Code', file: 'Files', snippet: 'Snippets' };

function fmtDate(ts) {
  return new Date(ts).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function timeAgo(ts) {
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
function escapeHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

// ---------- toast (with optional action, e.g. Undo) ----------
let toastTimer;
function showToast(title, sub, action) {
  $('toastTitle').textContent = title;
  $('toastSub').textContent = sub || '';
  const btn = $('toastAction');
  btn.hidden = !action;
  if (action) { btn.textContent = action.label; btn.onclick = () => { $('toast').hidden = true; action.fn(); }; }
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, action ? 6000 : 2400);
}

function confirmDialog({ title, message, ok = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    $('confirmTitle').textContent = title;
    $('confirmMsg').textContent = message;
    $('confirmOk').textContent = ok;
    $('confirmOk').classList.toggle('danger', danger);
    confirmModal.hidden = false;
    $('confirmOk').focus();
    const done = (v) => { confirmModal.hidden = true; confirmModal._cancel = null; resolve(v); };
    $('confirmOk').onclick = () => done(true);
    $('confirmCancel').onclick = () => done(false);
    confirmModal.onclick = (e) => { if (e.target === confirmModal) done(false); };
    confirmModal._cancel = () => done(false);
  });
}

function beep() {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.12, ac.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.25);
    o.connect(g).connect(ac.destination);
    o.start(); o.stop(ac.currentTime + 0.26);
  } catch (e) { /* ignore */ }
}

// ---------- cards ----------
function renderCard(item, inTrash) {
  const t = TYPE_LABEL[item.type] ? item.type : 'text';
  const el = document.createElement('div');
  el.className = 'card' + (selected.has(item.id) ? ' selected' : '');
  el.dataset.id = item.id;

  const tags = (item.tags && item.tags.length)
    ? `<div class="card-tags">${item.tags.map((x) => `<span>${escapeHtml(x)}</span>`).join('')}</div>` : '';
  const body = item.type === 'image'
    ? `<div class="card-image-preview"><img src="${item.content}" alt="" /></div>`
    : `<div class="card-preview${item.type === 'code' ? ' mono' : ''}">${escapeHtml(item.preview || '')}</div>`;

  el.innerHTML = `
    <div class="card-top">
      <button class="card-check" title="Select">${svg('check')}</button>
      <div class="card-icon t-${t}">${svg(t)}</div>
      <div class="card-kind"><b>${TYPE_LABEL[t]}</b><span>${timeAgo(item.created_at)}</span></div>
      ${inTrash ? '' : `<button class="card-pin-btn ${item.pinned ? 'pinned-active' : ''}" title="${item.pinned ? 'Unpin' : 'Pin'}">${svg('pin')}</button>`}
    </div>
    ${body}${tags}
    <div class="card-meta">${item.char_count ? plural(item.char_count, 'character') : ''}</div>`;

  el.addEventListener('click', (e) => {
    if (e.target.closest('.card-pin-btn')) return;
    const multi = selectMode || e.ctrlKey || e.metaKey || e.shiftKey || e.target.closest('.card-check');
    if (multi) { toggleSelect(item.id, e.shiftKey); return; }
    openDetail(item);
  });
  const pin = el.querySelector('.card-pin-btn');
  if (pin) pin.addEventListener('click', async (e) => {
    e.stopPropagation();
    await window.clipdows.togglePin(item.id);
    refresh();
  });
  return el;
}

async function refresh() {
  if (appRoot.hidden) return;
  const inTrash = currentType === 'trash';
  const res = await window.clipdows.getItems({ limit: 500 });
  allItems = res.items || [];
  pinnedAll = res.pinned || [];
  trashCount = res.trashCount || 0;
  trashItems = inTrash ? ((await window.clipdows.getItems({ trashed: true, limit: 500 })).items || []) : [];
  if (inTrash) trashCount = trashItems.length;

  if (knownIds && settings.sound && allItems.some((i) => !knownIds.has(i.id))) beep();
  knownIds = new Set(allItems.map((i) => i.id));

  const counts = { all: allItems.length, pinned: pinnedAll.length, trash: trashCount };
  ['text', 'link', 'image', 'code', 'file', 'snippet'].forEach((t) => { counts[t] = allItems.filter((i) => i.type === t).length; });
  Object.keys(counts).forEach((k) => { const el = $(`count-${k}`); if (el) el.textContent = counts[k]; });

  const q = currentSearch.toLowerCase();
  const match = (i) => !q || ((i.type === 'image' ? '' : (i.content || '')) + ' ' + (i.preview || '') + ' ' + (i.tags || []).join(' ')).toLowerCase().includes(q);
  const byDate = (a, b) => currentSort === 'oldest' ? a.created_at - b.created_at : b.created_at - a.created_at;

  let base = inTrash ? trashItems : currentType === 'pinned' ? pinnedAll : currentType === 'all' ? allItems : allItems.filter((i) => i.type === currentType);
  base = base.filter(match).sort(byDate);
  const showPinned = currentType === 'all' && !q && pinnedAll.length > 0;
  const pinnedList = showPinned ? pinnedAll.slice().sort(byDate) : [];
  const gridList = showPinned ? base.filter((i) => !i.pinned) : base;

  itemsGrid.innerHTML = ''; pinnedGrid.innerHTML = '';
  pinnedSection.hidden = !showPinned;
  pinnedList.forEach((i) => pinnedGrid.appendChild(renderCard(i, false)));
  gridList.forEach((i) => itemsGrid.appendChild(renderCard(i, inTrash)));

  sectionTitle.textContent = TITLES[currentType] || 'Items';
  sectionCount.textContent = gridList.length ? plural(gridList.length, 'item') : '';
  emptyTrashBtn.hidden = !(inTrash && trashItems.length);

  const empty = pinnedList.length + gridList.length === 0;
  emptyState.hidden = !empty;
  if (empty) {
    $('emptyState').querySelector('.empty-title').textContent = inTrash ? 'Trash is empty' : q ? 'No results found' : 'Nothing here yet';
    $('emptyState').querySelector('.empty-sub').textContent = inTrash ? 'Deleted items stay here until you empty the trash.'
      : q ? 'Try a different search term or check your filters.' : 'Copy something and it will show up here.';
  }

  visibleIds = [...pinnedList, ...gridList].map((i) => i.id);
  [...selected].forEach((id) => { if (!visibleIds.includes(id)) selected.delete(id); });
  updateSelBar();

  if (selectedItem) {
    const still = [...allItems, ...trashItems].find((i) => i.id === selectedItem.id);
    if (!still) closeDetail();
  }
}

// ---------- selection ----------
function setSelectMode(on) {
  selectMode = on;
  if (!on) { selected.clear(); lastClickedId = null; }
  document.body.classList.toggle('selecting', on);
  selectModeBtn.classList.toggle('active', on);
  markSelection(); updateSelBar();
}
function toggleSelect(id, range) {
  if (range && lastClickedId && visibleIds.includes(lastClickedId)) {
    const a = visibleIds.indexOf(lastClickedId), b = visibleIds.indexOf(id);
    for (let k = Math.min(a, b); k <= Math.max(a, b); k++) selected.add(visibleIds[k]);
  } else if (selected.has(id)) selected.delete(id);
  else selected.add(id);
  lastClickedId = id;
  if (!selectMode) { selectMode = true; document.body.classList.add('selecting'); selectModeBtn.classList.add('active'); }
  markSelection(); updateSelBar();
}
function markSelection() {
  document.querySelectorAll('.card').forEach((c) => c.classList.toggle('selected', selected.has(c.dataset.id)));
}
function updateSelBar() {
  const inTrash = currentType === 'trash';
  selBar.hidden = !selectMode;
  selCount.textContent = selected.size ? `${selected.size} selected` : 'Select items';
  const none = selected.size === 0;
  selPin.disabled = selDelete.disabled = selRestore.disabled = none;
  selPin.hidden = inTrash;
  selRestore.hidden = !inTrash;
  setBtn(selDelete, 'trash', inTrash ? 'Delete forever' : 'Delete');
  selAll.lastChild.textContent = selected.size && selected.size === visibleIds.length ? 'Select none' : 'Select all';
}
function selectAllToggle() {
  if (!selectMode) setSelectMode(true);
  if (selected.size === visibleIds.length) selected.clear(); else visibleIds.forEach((id) => selected.add(id));
  markSelection(); updateSelBar();
}

async function bulk(action, ids) { return window.clipdows.bulkItems(action, ids); }

async function deleteIds(ids) {
  if (!ids.length) return;
  if (currentType === 'trash') {
    const ok = await confirmDialog({ title: 'Delete forever?', message: `${plural(ids.length, 'item')} will be permanently deleted. This can't be undone.`, ok: 'Delete forever', danger: true });
    if (!ok) return;
    await bulk('delete', ids);
    showToast(`${plural(ids.length, 'item')} deleted forever`);
  } else {
    await bulk('trash', ids);
    showToast(`Moved ${plural(ids.length, 'item')} to Trash`, '', { label: 'Undo', fn: async () => { await bulk('restore', ids); refresh(); } });
  }
  ids.forEach((id) => selected.delete(id));
  if (selectedItem && ids.includes(selectedItem.id)) closeDetail();
  refresh();
}

selectModeBtn.addEventListener('click', () => setSelectMode(!selectMode));
$('selCancel').addEventListener('click', () => setSelectMode(false));
selAll.addEventListener('click', selectAllToggle);
selDelete.addEventListener('click', () => deleteIds([...selected]));
selPin.addEventListener('click', async () => {
  const ids = [...selected];
  const allPinned = ids.every((id) => pinnedAll.some((p) => p.id === id));
  await bulk(allPinned ? 'unpin' : 'pin', ids);
  showToast(allPinned ? `Unpinned ${plural(ids.length, 'item')}` : `Pinned ${plural(ids.length, 'item')}`);
  refresh();
});
selRestore.addEventListener('click', async () => {
  const ids = [...selected];
  await bulk('restore', ids);
  ids.forEach((id) => selected.delete(id));
  showToast(`Restored ${plural(ids.length, 'item')}`);
  refresh();
});
async function emptyTrash() {
  const ok = await confirmDialog({ title: 'Empty trash?', message: 'Everything in Trash will be permanently deleted. This can\'t be undone.', ok: 'Empty trash', danger: true });
  if (!ok) return;
  await bulk('emptyTrash', []);
  showToast('Trash emptied');
  refresh();
}
emptyTrashBtn.addEventListener('click', emptyTrash);

// ---------- nav, chips, search, sort, view ----------
function setType(t) {
  currentType = t;
  navGroup.querySelectorAll('.nav-item').forEach((n) => n.classList.toggle('active', n.dataset.type === t));
  chipsEl.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c.dataset.type === t));
  selected.clear(); lastClickedId = null;
  if (!detailPanel.hidden) closeDetail();
  content.scrollTop = 0;
  refresh();
}
navGroup.addEventListener('click', (e) => { const b = e.target.closest('.nav-item'); if (b) setType(b.dataset.type); });
chipsEl.addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (b) setType(b.dataset.type); });

let searchDebounce;
searchInput.addEventListener('input', (e) => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => { currentSearch = e.target.value.trim(); refresh(); }, 120);
});
sortSelect.addEventListener('change', () => { currentSort = sortSelect.value; refresh(); });

function setViewMode(mode, persist) {
  const list = mode === 'list';
  content.classList.toggle('list-mode', list);
  listViewBtn.classList.toggle('active', list);
  gridViewBtn.classList.toggle('active', !list);
  if (persist) { settings.view = mode; saveSettings(); syncControls(); }
}
gridViewBtn.addEventListener('click', () => setViewMode('grid', true));
listViewBtn.addEventListener('click', () => setViewMode('list', true));

// ---------- keyboard ----------
document.addEventListener('keydown', (e) => {
  const typing = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable;
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && e.key.toLowerCase() === 'f') { e.preventDefault(); searchInput.focus(); return; }
  if (ctrl && e.key.toLowerCase() === 'a' && !typing && !appRoot.hidden && !anyModalOpen()) { e.preventDefault(); if (selected.size !== visibleIds.length) { setSelectMode(true); visibleIds.forEach((id) => selected.add(id)); markSelection(); updateSelBar(); } return; }
  if (e.key === 'Delete' && !typing && !appRoot.hidden && !anyModalOpen()) {
    if (selected.size) deleteIds([...selected]);
    else if (selectedItem) detailTrash.click();
    return;
  }
  if (e.key === 'Escape') {
    if (!confirmModal.hidden) { confirmModal._cancel && confirmModal._cancel(); return; }
    if (!snippetModal.hidden) { snippetModal.hidden = true; return; }
    if (!settingsModal.hidden) { settingsModal.hidden = true; return; }
    if (!devicesModal.hidden) { closeDevices(); return; }
    if (selectMode) { setSelectMode(false); return; }
    if (!detailPanel.hidden) closeDetail();
  }
});
function anyModalOpen() { return !(confirmModal.hidden && snippetModal.hidden && settingsModal.hidden && devicesModal.hidden); }

// ---------- new snippet ----------
function openSnippet() { $('snippetTitle').value = ''; $('snippetContent').value = ''; snippetModal.hidden = false; $('snippetTitle').focus(); }
async function saveSnippet() {
  const title = $('snippetTitle').value.trim();
  const text = $('snippetContent').value;
  if (!title || !text.trim()) { showToast('Add a title and some text', 'Both are needed to save a snippet.'); return; }
  await window.clipdows.createSnippet(title, text, 'General');
  snippetModal.hidden = true;
  showToast('Snippet saved', title);
  refresh();
}
$('newSnippetBtn').addEventListener('click', openSnippet);
$('snippetSave').addEventListener('click', saveSnippet);
$('snippetCancel').addEventListener('click', () => { snippetModal.hidden = true; });
$('snippetClose').addEventListener('click', () => { snippetModal.hidden = true; });
snippetModal.addEventListener('click', (e) => { if (e.target === snippetModal) snippetModal.hidden = true; });
$('snippetContent').addEventListener('keydown', (e) => { if (e.ctrlKey && e.key === 'Enter') saveSnippet(); });

// ---------- detail panel ----------
function renderTags(item) {
  tagChips.innerHTML = (item.tags || []).map((t) => `<span class="tag-chip">${escapeHtml(t)}<button data-tag="${escapeHtml(t)}">✕</button></span>`).join('');
  tagChips.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const newTags = (selectedItem.tags || []).filter((t) => t !== btn.dataset.tag);
      const res = await window.clipdows.updateTags(selectedItem.id, newTags);
      selectedItem = res.item || { ...selectedItem, tags: newTags };
      renderTags(selectedItem);
      refresh();
    });
  });
}
function paintDetailTools(item) {
  const t = currentType === 'trash';
  setBtn(detailPin, t ? 'undo' : 'pin', t ? 'Restore' : item.pinned ? 'Unpin' : 'Pin');
  setBtn(detailTrash, 'trash', t ? 'Delete forever' : 'Delete');
  setBtn(detailEdit, 'edit', 'Edit');
  detailEdit.classList.remove('active-state');
  detailEdit.hidden = t || item.type === 'image';
  detailShare.hidden = t;
  detailPaste.hidden = t;
  detailPin.classList.toggle('pinned-active', !t && !!item.pinned);
  tagAddBtn.hidden = t;
}
function openDetail(item) {
  selectedItem = item;
  detailPanel.hidden = false;
  detailBody.contentEditable = 'false';
  $('detailTypeChip').textContent = TYPE_LABEL[item.type] || 'Text';
  $('detailMeta').textContent = fmtDate(item.created_at);
  detailBody.classList.toggle('mono', item.type === 'code');
  detailBody.innerHTML = item.type === 'image' ? `<img src="${item.content}" alt="" />` : escapeHtml(item.content || '');
  detailCount.textContent = item.char_count ? plural(item.char_count, 'character') : '';
  paintDetailTools(item);
  renderTags(item);
  tagInput.hidden = true;
}
function closeDetail() { detailPanel.hidden = true; selectedItem = null; }
$('detailBack').addEventListener('click', closeDetail);
$('detailClose').addEventListener('click', closeDetail);

$('detailCopy').addEventListener('click', async () => {
  if (!selectedItem) return;
  await window.clipdows.copyOnly(selectedItem.id);
  showToast('Copied to clipboard', selectedItem.preview || selectedItem.type);
});
detailPaste.addEventListener('click', async () => {
  if (!selectedItem) return;
  await window.clipdows.pasteItem(selectedItem.id);
  showToast('Pasted', selectedItem.preview || selectedItem.type);
});
detailPin.addEventListener('click', async () => {
  if (!selectedItem) return;
  if (currentType === 'trash') {
    const id = selectedItem.id;
    await bulk('restore', [id]);
    closeDetail();
    showToast('Item restored');
    refresh();
    return;
  }
  await window.clipdows.togglePin(selectedItem.id);
  selectedItem.pinned = selectedItem.pinned ? 0 : 1;
  paintDetailTools(selectedItem);
  refresh();
});
detailTrash.addEventListener('click', () => { if (selectedItem) deleteIds([selectedItem.id]); });
detailShare.addEventListener('click', async () => {
  if (!selectedItem) return;
  await window.clipdows.copyOnly(selectedItem.id);
  showToast('Copied for sharing', 'Paste it anywhere to share this item');
});
detailEdit.addEventListener('click', async () => {
  if (!selectedItem || selectedItem.type === 'image') return;
  if (detailBody.contentEditable !== 'true') {
    detailBody.contentEditable = 'true';
    detailBody.focus();
    setBtn(detailEdit, 'check', 'Save');
    detailEdit.classList.add('active-state');
  } else {
    const res = await window.clipdows.updateContent(selectedItem.id, detailBody.innerText);
    if (res.item) selectedItem = res.item;
    detailBody.contentEditable = 'false';
    setBtn(detailEdit, 'edit', 'Edit');
    detailEdit.classList.remove('active-state');
    detailCount.textContent = selectedItem.char_count ? plural(selectedItem.char_count, 'character') : '';
    showToast('Changes saved');
    refresh();
  }
});

tagAddBtn.addEventListener('click', () => { tagInput.hidden = false; tagInput.value = ''; tagInput.focus(); });
tagInput.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter') {
    const val = tagInput.value.trim();
    if (val && selectedItem) {
      const newTags = [...new Set([...(selectedItem.tags || []), val])];
      const res = await window.clipdows.updateTags(selectedItem.id, newTags);
      selectedItem = res.item || { ...selectedItem, tags: newTags };
      renderTags(selectedItem);
      refresh();
    }
    tagInput.hidden = true;
  } else if (e.key === 'Escape') { e.stopPropagation(); tagInput.hidden = true; }
});

// ---------- settings (auto-saved) ----------
const SETTINGS_KEY = 'clipdows:settings:v2';
const DEFAULTS = { theme: 'system', a1: '#4F8DF7', a2: '#3B6CF0', tray: true, startup: true, sound: false, compact: false, view: 'grid' };
const darkMq = window.matchMedia('(prefers-color-scheme: dark)');

function readSaved() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; }
  catch (e) { return { ...DEFAULTS }; }
}
let settings = readSaved();
function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ } }

function applySettings() {
  const dark = settings.theme === 'dark' || (settings.theme === 'system' && darkMq.matches);
  const root = document.documentElement;
  root.dataset.theme = dark ? 'dark' : 'light';
  root.style.setProperty('--accent-1', settings.a1);
  root.style.setProperty('--accent-2', settings.a2);
  content.classList.toggle('compact', !!settings.compact);
  document.body.classList.toggle('compact', !!settings.compact);
  if (window.clipdows.applySettings) window.clipdows.applySettings({ tray: settings.tray, startup: settings.startup, dark });
}
function syncControls() {
  document.querySelectorAll('input[name="theme"]').forEach((r) => { r.checked = r.value === settings.theme; });
  accentRow.querySelectorAll('.accent-swatch').forEach((sw) => sw.classList.toggle('active', sw.dataset.a1 === settings.a1 && sw.dataset.a2 === settings.a2));
  document.querySelectorAll('[data-setting]').forEach((c) => {
    if (c.type === 'checkbox') c.checked = !!settings[c.dataset.setting]; else c.value = settings[c.dataset.setting];
  });
}
darkMq.addEventListener('change', () => { if (settings.theme === 'system') applySettings(); });

const PANE_TITLES = { general: 'General', shortcuts: 'Shortcuts', sync: 'Sync & Devices', privacy: 'Privacy', appearance: 'Appearance', advanced: 'Advanced' };
function openSettings(pane = 'general') {
  syncControls();
  document.querySelectorAll('.set-nav-item').forEach((b) => b.classList.toggle('active', b.dataset.pane === pane));
  document.querySelectorAll('.set-pane').forEach((p) => { p.hidden = p.dataset.pane !== pane; });
  $('setHeading').textContent = PANE_TITLES[pane];
  settingsModal.hidden = false;
}
$('openSettingsBtn').addEventListener('click', () => openSettings());
$('userChip').addEventListener('click', () => openSettings('general'));
$('settingsClose').addEventListener('click', () => { settingsModal.hidden = true; });
settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) settingsModal.hidden = true; });
$('setNav').addEventListener('click', (e) => { const b = e.target.closest('.set-nav-item'); if (b) openSettings(b.dataset.pane); });

document.querySelector('.settings-content').addEventListener('change', (e) => {
  const t = e.target;
  if (t.name === 'theme') settings.theme = t.value;
  else if (t.dataset.setting) settings[t.dataset.setting] = t.type === 'checkbox' ? t.checked : t.value;
  else return;
  saveSettings(); applySettings();
  if (t.dataset.setting === 'view') setViewMode(settings.view, false);
});
accentRow.addEventListener('click', (e) => {
  const b = e.target.closest('.accent-swatch');
  if (!b) return;
  settings.a1 = b.dataset.a1; settings.a2 = b.dataset.a2;
  saveSettings(); applySettings(); syncControls();
});

$('manageDevicesBtn').addEventListener('click', () => { settingsModal.hidden = true; openDevices(); });
$('clearHistoryBtn').addEventListener('click', async () => {
  const ok = await confirmDialog({ title: 'Clear history?', message: 'Every unpinned item moves to Trash. You can restore them from there.', ok: 'Clear history', danger: true });
  if (!ok) return;
  await bulk('clearUnpinned', []);
  showToast('History cleared', 'Unpinned items are in Trash');
  refresh();
});
$('emptyTrashSettingsBtn').addEventListener('click', emptyTrash);
$('exportBtn').addEventListener('click', async () => {
  const { items } = await window.clipdows.getItems({ limit: 100000 });
  const out = items.map(({ id, type, content, tags, pinned, created_at }) => ({ id, type, content, tags, pinned, created_at }));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }));
  a.download = `clipdows-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  showToast('Export ready', plural(out.length, 'item'));
});

// ---------- devices ----------
const devicesBody = $('devicesBody');
function updateDevicesCount() {
  const n = devicesBody.querySelectorAll('.device-row').length;
  $('devicesCount').textContent = `${plural(n, 'device')} connected`;
  $('syncPaneSub').textContent = `${plural(n, 'device')} connected`;
  $('syncSub').textContent = `${plural(n, 'device')} online`;
}
function addDeviceRow(uid, name, linkedAt) {
  if (devicesBody.querySelector(`.device-row[data-device="${CSS.escape(uid)}"]`)) return;
  const row = document.createElement('div');
  row.className = 'device-row';
  row.dataset.device = uid;
  row.innerHTML = `
    <div class="device-icon">${svg('phone')}</div>
    <div class="device-info"><b>${escapeHtml(name)}</b><span>${linkedAt ? 'Linked ' + timeAgo(linkedAt) : 'Synced in real time'}</span></div>
    <button class="ghost-btn danger sm revoke-btn">Revoke</button>`;
  devicesBody.appendChild(row);
  updateDevicesCount();
}
async function loadDevices() {
  devicesBody.querySelectorAll('.device-row:not([data-device="this"])').forEach((r) => r.remove());
  try {
    if (window.clipSync && window.clipSync.listDevices) (await window.clipSync.listDevices()).forEach((d) => addDeviceRow(d.uid, d.name || 'Android phone', d.linkedAt));
  } catch (err) { console.error('[devices] could not load linked devices:', err); }
  updateDevicesCount();
}
function showPairView(show) { $('devicesListView').hidden = show; $('devicesPairView').hidden = !show; }
function openDevices() { devicesModal.hidden = false; showPairView(false); loadDevices(); }
function closeDevices() { devicesModal.hidden = true; if (window.clipSync) window.clipSync.cancelPairing(); }
$('syncCard').addEventListener('click', openDevices);
$('devicesClose').addEventListener('click', closeDevices);
devicesModal.addEventListener('click', (e) => { if (e.target === devicesModal) closeDevices(); });

devicesBody.addEventListener('click', async (e) => {
  const btn = e.target.closest('.revoke-btn');
  if (!btn) return;
  const row = btn.closest('.device-row');
  const ok = await confirmDialog({ title: 'Revoke this device?', message: 'It will stop syncing with your clipboard. You can pair it again any time.', ok: 'Revoke', danger: true });
  if (!ok) return;
  try {
    if (window.clipSync && window.clipSync.revokeDevice) await window.clipSync.revokeDevice(row.dataset.device);
    row.remove(); updateDevicesCount(); showToast('Device revoked');
  } catch (err) {
    console.error(err);
    showToast('Could not revoke device', 'Check your connection and try again.');
  }
});

$('pairCancelBtn').addEventListener('click', () => { window.clipSync.cancelPairing(); showPairView(false); });
$('addDeviceBtn').addEventListener('click', async () => {
  if (!window.clipSync) { showToast('Still connecting…', 'Try again in a second.'); return; }
  showPairView(true);
  $('pairStatus').textContent = 'Generating your pairing code…';
  $('pairQrImg').removeAttribute('src');
  try {
    const { qrDataUrl } = await window.clipSync.beginPairing((device) => {
      addDeviceRow(device.uid, device.name, Date.now());
      showToast('Device connected', `${device.name} is now synced`);
      showPairView(false);
    });
    $('pairQrImg').src = qrDataUrl;
    $('pairStatus').textContent = 'Waiting for scan…';
  } catch (err) {
    console.error(err);
    $('pairStatus').textContent = 'Could not generate a pairing code. Check your connection and try again.';
  }
});

// ---------- boot ----------
applySettings();
syncControls();
setViewMode(settings.view, false);
window.clipdows.onItemsUpdated(() => refresh());
refresh();