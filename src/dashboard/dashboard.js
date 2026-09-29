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
  crown: '<path d="m3 8 4.5 4L12 5l4.5 7L21 8l-2 11H5z"/><path d="M5 19h14"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
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

// ---------- one-time notice: ClipDows starts with Windows and keeps running in the tray ----------
const BG_NOTICE_KEY = 'clipdows:bgNoticeSeen:v1';
function maybeShowBgNotice() {
  try { if (localStorage.getItem(BG_NOTICE_KEY)) return; } catch (e) { /* show it anyway */ }
  $('bgNoticeModal').hidden = false;
}
function closeBgNotice() {
  try { localStorage.setItem(BG_NOTICE_KEY, String(Date.now())); } catch (e) { /* ignore */ }
  $('bgNoticeModal').hidden = true;
}
$('bgNoticeOk').addEventListener('click', closeBgNotice);
$('bgNoticeSettings').addEventListener('click', () => { closeBgNotice(); openSettings(); });

async function applyUser(user) {
  if (user) {
    const name = user.displayName || (user.email || '').split('@')[0];
    const initials = initialsFor(user.displayName, user.email);
    $('userName').textContent = $('sUserName').textContent = name;
    $('userEmail').textContent = $('sUserEmail').textContent = user.email || '';
    $('userAvatar').textContent = $('sUserAvatar').textContent = initials;
    // Point the local database at THIS account's private file before anything is shown.
    await window.clipdows.setSession(user.uid);
    await loadPlan();
    resetViewState();
    onboarding.hidden = true;
    appRoot.hidden = false;
    refresh();
    if (window.clipSync) { window.clipSync.startClipSync(user.uid); loadDevices(); }
    maybeShowBgNotice();
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
  [settingsModal, devicesModal, snippetModal, confirmModal, $('vaultModal'), $('timeModal')].forEach((m) => { m.hidden = true; });
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
const detailPin = $('detailPin'), detailEdit = $('detailEdit'), detailShare = $('detailShare'), detailDownload = $('detailDownload');
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

function promptDialog({ title, message, placeholder = '', value = '', ok = 'Save' }) {
  return new Promise((resolve) => {
    const input = $('confirmInput');
    $('confirmTitle').textContent = title;
    $('confirmMsg').textContent = message || '';
    $('confirmOk').textContent = ok;
    $('confirmOk').classList.remove('danger');
    input.hidden = false;
    input.placeholder = placeholder;
    input.value = value;
    confirmModal.hidden = false;
    input.focus();
    input.select();
    const done = (v) => {
      confirmModal.hidden = true;
      input.hidden = true;
      input.onkeydown = null;
      confirmModal._cancel = null;
      resolve(v);
    };
    $('confirmOk').onclick = () => done(input.value.trim() || null);
    $('confirmCancel').onclick = () => done(null);
    confirmModal.onclick = (e) => { if (e.target === confirmModal) done(null); };
    confirmModal._cancel = () => done(null);
    input.onkeydown = (e) => { if (e.key === 'Enter') done(input.value.trim() || null); };
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

// ---------- plans ----------
let planInfo = null;
let lockedCount = 0;
const FEATURE_TIER = { appFilter: 'Pro', customExpiry: 'Pro', export: 'Pro', actions: 'Pro', variables: 'Max', triggers: 'Max', timeMachine: 'Max' };
const UPGRADE_MSG = {
  pinned: (m) => `The Free plan allows ${m} pinned items. Upgrade for unlimited pins.`,
  snippets: (m) => `Your plan allows ${m} snippets. Upgrade for more.`,
  phones: (m) => `Your plan allows ${m} linked phone${m === 1 ? '' : 's'}. Upgrade to link more.`,
  appFilter: () => 'App filters and ignored apps are a Pro feature.',
  customExpiry: () => 'Custom secret-expiry time is a Pro feature.',
  export: () => 'Exporting your data is a Pro feature.',
  actions: () => 'This instant action is a Pro feature.',
  variables: () => 'Snippet variables are a Max feature.',
  triggers: () => 'Snippet triggers are a Max feature.',
  timeMachine: () => 'Time machine is a Max feature.',
};
function upgradeToast(feature, max) {
  const f = UPGRADE_MSG[feature];
  showToast('Upgrade to unlock', f ? f(max) : 'This feature needs a higher plan.');
}
async function loadPlan() {
  try { planInfo = await window.clipdows.getPlan(); } catch (e) { planInfo = null; }
  applyPlanUI();
  syncEntitlement(); // the server is the source of truth for paid plans
}
function applyPlanUI() {
  if (!planInfo) return;
  const label = planInfo.tier === 'max' ? 'Max' : planInfo.tier === 'pro' ? (planInfo.trial ? 'Pro trial' : 'Pro') : 'Free';
  const b = $('planBadge'); b.textContent = label; b.classList.toggle('ok', planInfo.tier !== 'free');
  $('planSub').textContent = planInfo.trial ? `${plural(planInfo.trialDaysLeft, 'day')} left in your free Pro trial.` : planInfo.tier === 'free' ? 'Upgrade for more history, sync and power features.' : 'Thanks for supporting ClipDows.';
  $('devPlanRow').hidden = !planInfo.dev; $('devPlanSel').value = planInfo.devTier || '';
  document.querySelectorAll('[data-feature]').forEach((row) => {
    const f = row.dataset.feature;
    const locked = !planInfo.limits[f];
    row.classList.toggle('plan-locked', locked);
    const label = row.querySelector('b');
    if (label && !label.querySelector('.tier-tag')) { const tg = document.createElement('em'); tg.className = 'tier-tag'; tg.textContent = FEATURE_TIER[f] || 'Pro'; label.appendChild(tg); }
    const tagEl = label && label.querySelector('.tier-tag'); if (tagEl) tagEl.hidden = !locked;
  });
  const can = !!planInfo.limits.triggers;
  $('snippetTrigger').disabled = !can;
  $('snippetTrigger').placeholder = can ? 'Trigger, e.g. ;addr  (optional)' : 'Trigger & variables — Max plan';
  $('snippetVarsHint').hidden = false;
  $('timeMachineBtn').classList.toggle('plan-locked', !planInfo.limits.timeMachine);
  renderPricing();
  applySettings(); // re-send plan-gated settings (ignored apps, secret expiry) to the main process
  if (window.clipSync && window.clipSync.publishPlan) window.clipSync.publishPlan(planInfo); // keep the phone app on the same plan
  if (!appRoot.hidden) refresh();
}
window.clipdows.onPlanChanged((info) => { planInfo = info; applyPlanUI(); renderReferral(); });
$('devPlanSel').addEventListener('change', async (e) => { planInfo = await window.clipdows.setDevPlan(e.target.value); applyPlanUI(); });

// ---------- pricing tab ----------
const PLAN_ORDER = ['free', 'pro', 'max'];
const PLAN_DEFS = {
  free: { name: 'Free', price: 0, icon: 'layers', tag: 'Everything you need to get started.',
    feats: ['100 clips of history', '5 pins and 10 snippets', '1 linked phone', 'Sensitive-data guard', 'Basic instant actions'] },
  pro: { name: 'Pro', price: 99, icon: 'zap', tag: 'For people who live in their clipboard.',
    feats: ['1,000 clips of history', 'Unlimited pins and paste stack', '3 linked phones with image sync', 'All instant actions and data export', 'Unlimited screenshot search'] },
  max: { name: 'Max', price: 199, icon: 'crown', tag: 'Every feature, no limits.',
    feats: ['Everything in Pro', 'Unlimited history and snippets', '10 linked phones, 1,000 synced clips', 'Snippet triggers and variables', 'Time machine'] },
};
const PLAN_COMPARE = [
  { group: 'History & storage', rows: [
    ['Clipboard history', '100 clips', '1,000 clips', 'Unlimited'],
    ['Pinned items', '5', 'Unlimited', 'Unlimited'],
    ['Snippets', '10', '100', 'Unlimited'],
    ['Paste stack', '5 items', 'Unlimited', 'Unlimited'],
    ['Search inside screenshots', '5 / month', 'Unlimited', 'Unlimited'] ] },
  { group: 'Sync & devices', rows: [
    ['Linked phones', '1', '3', '10'],
    ['Synced clips', '25', '200', '1,000'],
    ['Image sync', false, true, true] ] },
  { group: 'Productivity', rows: [
    ['Instant actions', 'Basic', 'All actions', 'All actions'],
    ['App filters and ignored apps', false, true, true],
    ['Custom secret expiry', false, true, true],
    ['Export your data', false, true, true] ] },
  { group: 'Power tools', rows: [
    ['Snippet variables', false, false, true],
    ['Snippet triggers', false, false, true],
    ['Time machine', false, false, true] ] },
];
function renderPricing() {
  const grid = $('planGrid'), table = $('compareTable');
  if (!grid || !table) return;
  const cur = planInfo ? planInfo.tier : 'free';
  const trial = !!(planInfo && planInfo.trial);
  const curIdx = PLAN_ORDER.indexOf(cur);
  const label = { free: 'Free', pro: trial ? 'Pro trial' : 'Pro', max: 'Max' }[cur];
  const paidNow = !!(planInfo && planInfo.paid && planInfo.paidUntil);
  $('pricingStatus').innerHTML = `Current plan: <b>${label}</b>` + (trial ? ` &middot; ${plural(planInfo.trialDaysLeft, 'day')} left` : paidNow ? (isLifetime(planInfo.paidUntil) ? ' &middot; Lifetime access' : ` &middot; active until ${planDate(planInfo.paidUntil)}`) : '');

  grid.innerHTML = PLAN_ORDER.map((t, i) => {
    const d = PLAN_DEFS[t];
    const isCur = t === cur && !(trial && t === 'pro');
    const isTrial = trial && t === 'pro';
    let flag = t === 'pro' ? '<span class="plan-flag">Most popular</span>' : '';
    if (isCur) flag = '<span class="plan-flag cur">Your plan</span>';
    if (isTrial) flag = `<span class="plan-flag">Trial &middot; ${plural(planInfo.trialDaysLeft, 'day')} left</span>`;
    let btn;
    if (isCur) btn = `<button class="plan-btn cur" disabled><i data-i="check"></i>Current</button>`;
    else if (i < curIdx || (trial && t === 'free')) btn = `<button class="plan-btn dim" disabled>Included</button>`;
    else btn = `<button class="plan-btn ${t === 'max' ? 'gold' : 'buy'}" data-buy="${t}">Buy Now<span class="pb-price">&middot; &#8377;${d.price} / month</span></button>`;
    const renew = isCur && paidNow && t !== 'free' && !isLifetime(planInfo.paidUntil) ? `<button class="plan-renew" data-buy="${t}">Extend by 30 days &middot; &#8377;${d.price}</button>` : '';
    return `<article class="plan-card ${t === 'pro' ? 'featured' : ''} ${t}">${flag}
      <div class="plan-head"><span class="plan-ico"><i data-i="${d.icon}"></i></span><div><div class="plan-name">${d.name}</div><div class="plan-tag">${d.tag}</div></div></div>
      <div class="plan-price"><span class="plan-amt"><small>&#8377;</small>${d.price}</span><span class="plan-per">${d.price ? '/ month' : 'forever'}</span></div>
      <div class="plan-rule"></div>
      <ul class="plan-feats">${d.feats.map((f) => `<li><i data-i="check"></i><span>${f}</span></li>`).join('')}</ul>
      ${btn}${renew}</article>`;
  }).join('');

  const hi = (t) => (t === cur ? 'cmp-cur' : '');
  const cell = (v, t) => `<span class="${hi(t)}">${v === true ? '<i class="cmp-yes" data-i="check"></i>' : v === false ? '<em class="cmp-no">&mdash;</em>' : v}</span>`;
  table.innerHTML = `<div class="cmp-row cmp-head"><span>Features</span>${PLAN_ORDER.map((t) => `<span class="${hi(t)}">${PLAN_DEFS[t].name}</span>`).join('')}</div>` +
    PLAN_COMPARE.map((g) => `<div class="cmp-row cmp-group"><span>${g.group}</span></div>` +
      g.rows.map((r) => `<div class="cmp-row"><span>${r[0]}</span>${cell(r[1], 'free')}${cell(r[2], 'pro')}${cell(r[3], 'max')}</div>`).join('')).join('');
  hydrate(grid); hydrate(table);
}
// ---------- Referral codes ----------
// The server checks the code and writes the plan; this side only sends the text and shows the result.
const LIFETIME_MS = 32503680000000; // anything past year 3000 means "lifetime"
function isLifetime(ms) { return Number(ms) >= LIFETIME_MS; }
let redeemBusy = false;
function renderReferral() {
  const st = $('refStatus'); if (!st) return;
  const cur = planInfo ? planInfo.tier : 'free';
  const trial = !!(planInfo && planInfo.trial);
  const label = { free: 'Free', pro: trial ? 'Pro trial' : 'Pro', max: 'Max' }[cur];
  const paidNow = !!(planInfo && planInfo.paid && planInfo.paidUntil);
  st.innerHTML = `Current plan: <b>${label}</b>` + (paidNow ? (isLifetime(planInfo.paidUntil) ? ' &middot; Lifetime' : ` &middot; until ${planDate(planInfo.paidUntil)}`) : trial ? ` &middot; ${plural(planInfo.trialDaysLeft, 'day')} left` : '');
}
function refShow(kind, title, text) {
  const m = $('refMsg');
  m.className = 'ref-msg ' + kind; m.hidden = false;
  m.innerHTML = `<i data-i="${kind === 'ok' ? 'check' : 'x'}"></i><div><b></b><span></span></div>`;
  m.querySelector('b').textContent = title; m.querySelector('span').textContent = text;
  hydrate(m);
}
async function redeemReferral() {
  if (redeemBusy) return;
  const code = $('refInput').value.trim();
  if (!code) { refShow('err', 'Enter a code first', 'Type or paste your referral code above.'); return; }
  if (!window.clipPay || !window.clipPay.redeem) { refShow('err', 'Not available', 'Please restart ClipDows and try again.'); return; }
  redeemBusy = true; $('refBtn').disabled = true; $('refBtn').innerHTML = '<span class="pay-spin"></span>Checking\u2026'; $('refMsg').hidden = true;
  try {
    const res = await window.clipPay.redeem(code);
    planInfo = await window.clipdows.setPaidPlan({ tier: res.tier, expiresAt: res.paidUntil });
    applyPlanUI(); renderPricing(); renderReferral();
    const name = PLAN_DEFS[res.tier].name;
    const detail = res.lifetime ? 'Lifetime access \u2014 no renewals, ever.' : `${plural(res.days, 'day')} of ${name}, active until ${planDate(res.paidUntil)}.`;
    refShow('ok', `${name} unlocked`, detail + ' Your paired phone will update too.');
    $('refInput').value = '';
    showToast(`${name} unlocked`, res.lifetime ? 'Lifetime access activated.' : `Active until ${planDate(res.paidUntil)}.`);
  } catch (err) {
    const c = String((err && err.code) || '');
    const msg = c.includes('unavailable') || c.includes('internal') ? 'Could not reach the server. Check your connection and try again.' : ((err && err.message) || 'Please try again.');
    refShow('err', 'Code not applied', msg);
  } finally {
    redeemBusy = false; $('refBtn').disabled = false; $('refBtn').textContent = 'Redeem';
  }
}
$('refBtn').addEventListener('click', redeemReferral);
$('refInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') redeemReferral(); });

// ---------- Razorpay checkout ----------
// Orders and verification happen on Cloud Functions (see functions/index.js). Nothing secret lives here.
let checkoutBusy = false;
const planDate = (ms) => new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
function loadRazorpayJs() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load Razorpay. Check your internet connection.'));
    document.head.appendChild(s);
  });
}
function setCheckoutBusy(tier, on) {
  document.querySelectorAll('[data-buy]').forEach((b) => {
    b.disabled = on;
    if (on && b.dataset.buy === tier && b.classList.contains('plan-btn')) b.innerHTML = '<span class="pay-spin"></span>Opening checkout\u2026';
  });
}
/** Asks the server which paid plan this account has and mirrors it locally (clears it if there is none). */
async function syncEntitlement() {
  if (!window.clipPay) return;
  try {
    const e = await window.clipPay.getEntitlement();
    const tier = e && e.tier ? e.tier : null;
    if (tier || (planInfo && planInfo.paid)) {
      planInfo = await window.clipdows.setPaidPlan({ tier, expiresAt: (e && e.paidUntil) || 0 });
      applyPlanUI();
    }
  } catch (err) { /* offline, or functions not deployed yet: keep the local plan */ }
}
async function confirmPayment(r) {
  const res = await window.clipPay.verifyPayment({ orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature });
  planInfo = await window.clipdows.setPaidPlan({ tier: res.tier, expiresAt: res.paidUntil });
  applyPlanUI();
  showToast(`Welcome to ${PLAN_DEFS[res.tier].name}`, `Your plan is active until ${planDate(res.paidUntil)}.`);
}
async function startCheckout(tier) {
  const d = PLAN_DEFS[tier];
  if (!d || checkoutBusy) return;
  if (!window.clipPay) { showToast('Payments unavailable', 'Please restart ClipDows and try again.'); return; }
  checkoutBusy = true; setCheckoutBusy(tier, true);
  try {
    await loadRazorpayJs();
    const order = await window.clipPay.createOrder(tier);
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent-2').trim() || '#3B6CF0';
    await new Promise((resolve) => {
      const rzp = new window.Razorpay({
        key: order.keyId, amount: order.amount, currency: order.currency, order_id: order.orderId,
        name: 'ClipDows', description: `${d.name} plan \u00B7 30 days`,
        prefill: { name: $('sUserName').textContent, email: $('sUserEmail').textContent },
        theme: { color: accent },
        handler: async (r) => {
          try { await confirmPayment(r); }
          catch (err) {
            showToast('Payment received', 'We could not activate your plan yet. Restart ClipDows in a minute; if it stays locked, contact support.');
            syncEntitlement();
          }
          resolve();
        },
        modal: { ondismiss: () => resolve() },
      });
      rzp.on('payment.failed', (r) => showToast('Payment failed', (r.error && r.error.description) || 'Please try again.'));
      rzp.open();
    });
  } catch (err) {
    showToast('Could not start payment', (err && err.message) || 'Please try again.');
  } finally {
    checkoutBusy = false; renderPricing();
  }
}
$('planGrid').addEventListener('click', (e) => { const b = e.target.closest('[data-buy]'); if (b) startCheckout(b.dataset.buy); });
$('viewPlansBtn').addEventListener('click', () => openSettings('pricing'));

// ---------- source-app icons ----------
const appIconCache = new Map();
async function loadAppIcon(exePath, img) {
  if (!img) return;
  if (!appIconCache.has(exePath)) appIconCache.set(exePath, window.clipdows.getAppIcon(exePath).catch(() => null));
  const url = await appIconCache.get(exePath);
  if (url) { img.src = url; img.hidden = false; }
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
    <div class="card-meta">${item.sensitive ? `<span class="badge-sens">${escapeHtml(item.sensitive_label || 'Sensitive')} &middot; auto-deletes</span>` : (item.char_count ? plural(item.char_count, 'character') : '')}${item.source_app ? `<span class="card-src"><img class="card-src-icon" alt="" hidden />${escapeHtml(item.source_app)}</span>` : ''}${item.type === 'image' && item.ocr_text ? '<span class="card-src">Text found</span>' : ''}</div>`;
  if (item.source_app && item.source_path) loadAppIcon(item.source_path, el.querySelector('.card-src-icon'));

  el.addEventListener('click', (e) => {
    if (e.target.closest('.card-pin-btn')) return;
    const multi = selectMode || e.ctrlKey || e.metaKey || e.shiftKey || e.target.closest('.card-check');
    if (multi) { toggleSelect(item.id, e.shiftKey); return; }
    openDetail(item);
  });
  const pin = el.querySelector('.card-pin-btn');
  if (pin) pin.addEventListener('click', async (e) => {
    e.stopPropagation();
    const pr = await window.clipdows.togglePin(item.id);
    if (pr && pr.limit) upgradeToast('pinned', pr.max);
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
  lockedCount = res.lockedCount || 0;
  trashItems = inTrash ? ((await window.clipdows.getItems({ trashed: true, limit: 500 })).items || []) : [];
  if (inTrash) trashCount = trashItems.length;

  if (knownIds && settings.sound && allItems.some((i) => !knownIds.has(i.id))) beep();
  knownIds = new Set(allItems.map((i) => i.id));

  const counts = { all: allItems.length, pinned: pinnedAll.length, trash: trashCount };
  ['text', 'link', 'image', 'code', 'file', 'snippet'].forEach((t) => { counts[t] = allItems.filter((i) => i.type === t).length; });
  Object.keys(counts).forEach((k) => { const el = $(`count-${k}`); if (el) el.textContent = counts[k]; });

  const q = currentSearch.toLowerCase();
  // "app:code invoice" -> clips from an app matching "code" that contain "invoice"
  const am = planInfo && planInfo.limits.appFilter ? q.match(/^app:(\S*)\s*(.*)$/) : null;
  const appQ = am ? am[1] : '', textQ = am ? am[2] : q;
  const match = (i) => {
    if (appQ && !String(i.source_app || '').toLowerCase().includes(appQ)) return false;
    if (!textQ) return true;
    const body = i.type === 'image' ? (i.ocr_text || '') : i.sensitive ? '' : (i.content || ''); // images: OCR text; secrets: never searchable
    return (body + ' ' + (i.preview || '') + ' ' + (i.tags || []).join(' ') + ' ' + (i.source_app || '')).toLowerCase().includes(textQ);
  };
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
  sectionCount.textContent = (gridList.length ? plural(gridList.length, 'item') : '') + (lockedCount && !inTrash && currentType === 'all' && !q ? `${gridList.length ? ' · ' : ''}${plural(lockedCount, 'older clip')} locked (upgrade to see)` : '');
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
  const br = await bulk(allPinned ? 'unpin' : 'pin', ids);
  if (br && br.limited) { upgradeToast('pinned', br.max); refresh(); return; }
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
    if (!$('timeModal').hidden) { $('timeModal').hidden = true; return; }
    if (!snippetModal.hidden) { snippetModal.hidden = true; return; }
    if (!settingsModal.hidden) { settingsModal.hidden = true; return; }
    if (!devicesModal.hidden) { closeDevices(); return; }
    if (selectMode) { setSelectMode(false); return; }
    if (!detailPanel.hidden) closeDetail();
  }
});
function anyModalOpen() { return !(confirmModal.hidden && snippetModal.hidden && settingsModal.hidden && devicesModal.hidden && $('vaultModal').hidden && $('timeModal').hidden); }

// ---------- new snippet ----------
function openSnippet() { $('snippetTitle').value = ''; $('snippetContent').value = ''; $('snippetTrigger').value = ''; snippetModal.hidden = false; $('snippetTitle').focus(); }
async function saveSnippet() {
  const title = $('snippetTitle').value.trim();
  const text = $('snippetContent').value;
  if (!title || !text.trim()) { showToast('Add a title and some text', 'Both are needed to save a snippet.'); return; }
  const res = await window.clipdows.createSnippet(title, text, 'General', $('snippetTrigger').value);
  if (res && res.ok === false) {
    if (res.limit) upgradeToast(res.limit, res.max); else showToast('Could not save snippet', res.error || 'Please try again.');
    return;
  }
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
  detailDownload.hidden = t || item.type !== 'image';
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
  renderQuickActions(item);
}

// ---------- instant actions ----------
function renderQuickActions(item) {
  const box = $('detailQuick');
  box.innerHTML = '';
  const acts = (window.clipActions && item.type !== 'image' && !item.sensitive && currentType !== 'trash') ? window.clipActions.list(item.content) : [];
  box.hidden = !acts.length;
  const full = !!(planInfo && planInfo.limits.actions === 'full');
  acts.forEach((a) => {
    const btn = document.createElement('button');
    const locked = a.full && !full;
    btn.className = 'quick-chip' + (locked ? ' locked' : '');
    if (a.swatch) { const sw = document.createElement('i'); sw.className = 'quick-swatch'; sw.style.background = a.swatch; btn.appendChild(sw); }
    btn.appendChild(document.createTextNode(a.label + (locked ? ' · Pro' : '')));
    btn.addEventListener('click', async () => {
      if (locked) { upgradeToast('actions'); return; }
      try { await navigator.clipboard.writeText(a.run(item.content || '')); showToast('Copied', a.label); }
      catch (e) { showToast('Could not apply', 'This content cannot be converted.'); }
    });
    box.appendChild(btn);
  });
}

// ---------- time machine ----------
let tmItems = [], tmMin = 0, tmMax = 0;
const pad2 = (n) => String(n).padStart(2, '0');
const toLocalInput = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
async function openTimeMachine() {
  if (!planInfo || !planInfo.limits.timeMachine) { upgradeToast('timeMachine'); return; }
  const res = await window.clipdows.getItems({ limit: 100000 });
  tmItems = (res.items || []).filter((i) => i.type !== 'snippet');
  tmMax = Date.now();
  tmMin = tmItems.length ? Math.min(...tmItems.map((i) => i.created_at)) : tmMax - 86400000;
  $('tmSlider').value = 1000;
  $('tmWhen').value = toLocalInput(tmMax);
  $('timeModal').hidden = false;
  renderTimeMachine();
}
function tmSelected() { const v = new Date($('tmWhen').value).getTime(); return Number.isFinite(v) ? v : tmMax; }
function renderTimeMachine() {
  const at = tmSelected(), win = +$('tmWindow').value;
  const hits = tmItems.filter((i) => Math.abs(i.created_at - at) <= win).sort((a, b) => a.created_at - b.created_at).slice(0, 150);
  const list = $('tmList'); list.innerHTML = '';
  $('tmSub').textContent = tmItems.length ? `${plural(hits.length, 'clip')} around ${new Date(at).toLocaleString()}` : 'Nothing copied yet.';
  hits.forEach((i) => {
    const row = document.createElement('div'); row.className = 'tm-item';
    const time = document.createElement('span'); time.className = 'tm-time'; time.textContent = new Date(i.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const body = document.createElement('span'); body.className = 'tm-body';
    body.textContent = (i.type === 'image' ? 'Image' : (i.preview || '')) + (i.source_app ? `  ·  ${i.source_app}` : '');
    const cp = document.createElement('button'); cp.className = 'ghost-btn sm'; cp.textContent = 'Copy';
    cp.addEventListener('click', async () => { await window.clipdows.copyOnly(i.id); showToast('Copied', 'Back on your clipboard'); });
    row.append(time, body, cp); list.appendChild(row);
  });
  if (tmItems.length && !hits.length) { const e = document.createElement('div'); e.className = 'tm-empty'; e.textContent = 'Nothing copied in this window — widen it or move the slider.'; list.appendChild(e); }
}
$('timeMachineBtn').addEventListener('click', openTimeMachine);
$('tmClose').addEventListener('click', () => { $('timeModal').hidden = true; });
$('timeModal').addEventListener('click', (e) => { if (e.target === $('timeModal')) $('timeModal').hidden = true; });
$('tmSlider').addEventListener('input', (e) => { $('tmWhen').value = toLocalInput(tmMin + (tmMax - tmMin) * (+e.target.value / 1000)); renderTimeMachine(); });
$('tmWhen').addEventListener('change', () => {
  const span = tmMax - tmMin || 1;
  $('tmSlider').value = Math.round(Math.min(1, Math.max(0, (tmSelected() - tmMin) / span)) * 1000);
  renderTimeMachine();
});
$('tmWindow').addEventListener('change', renderTimeMachine);
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
  const pr = await window.clipdows.togglePin(selectedItem.id);
  if (pr && pr.limit) { upgradeToast('pinned', pr.max); return; }
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
detailDownload.addEventListener('click', async () => {
  if (!selectedItem || selectedItem.type !== 'image') return;
  const r = await window.clipdows.saveImage(selectedItem.id);
  if (r && r.ok) showToast('Image saved to Downloads', r.name);
  else showToast('Could not save image', (r && r.error) || 'Try again');
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
const DEFAULTS = { theme: 'system', a1: '#4F8DF7', a2: '#3B6CF0', tray: true, startup: true, sound: false, compact: false, view: 'grid', guard: true, sourceApp: true, ocr: true, ignoredApps: '', secretTtl: '0' };
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
  if (window.clipdows.applySettings) window.clipdows.applySettings({ tray: settings.tray, startup: settings.startup, dark, guard: settings.guard, sourceApp: settings.sourceApp, ocr: settings.ocr, ignoredApps: settings.ignoredApps, secretTtl: settings.secretTtl });
}
function syncControls() {
  document.querySelectorAll('input[name="theme"]').forEach((r) => { r.checked = r.value === settings.theme; });
  accentRow.querySelectorAll('.accent-swatch').forEach((sw) => sw.classList.toggle('active', sw.dataset.a1 === settings.a1 && sw.dataset.a2 === settings.a2));
  document.querySelectorAll('[data-setting]').forEach((c) => {
    if (c.type === 'checkbox') c.checked = !!settings[c.dataset.setting]; else c.value = settings[c.dataset.setting];
  });
}
darkMq.addEventListener('change', () => { if (settings.theme === 'system') applySettings(); });

const PANE_TITLES = { general: 'General', pricing: 'Pricing', referral: 'Referral', shortcuts: 'Shortcuts', sync: 'Sync & Devices', privacy: 'Privacy', appearance: 'Appearance', advanced: 'Advanced' };
function openSettings(pane = 'general') {
  syncControls();
  document.querySelectorAll('.set-nav-item').forEach((b) => b.classList.toggle('active', b.dataset.pane === pane));
  document.querySelectorAll('.set-pane').forEach((p) => { p.hidden = p.dataset.pane !== pane; });
  $('setHeading').textContent = PANE_TITLES[pane];
  document.querySelector('.settings-modal').classList.toggle('wide', pane === 'pricing');
  settingsModal.hidden = false;
  if (pane === 'referral') { renderReferral(); setTimeout(() => $('refInput').focus(), 60); }
}
$('openSettingsBtn').addEventListener('click', () => openSettings());
$('userChip').addEventListener('click', () => openSettings('general'));
$('settingsClose').addEventListener('click', () => { settingsModal.hidden = true; });
settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) settingsModal.hidden = true; });
$('setNav').addEventListener('click', (e) => { const b = e.target.closest('.set-nav-item'); if (b) openSettings(b.dataset.pane); });

// ---------- global shortcut recorder ----------
const shortcutDisplay = $('shortcutDisplay');
const MODIFIER_KEYS = new Set(['Control', 'Alt', 'Shift', 'Meta']);
const KEY_LABELS = { ' ': 'Space', Escape: 'Esc', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right' };

function acceleratorToLabel(accel) {
  return String(accel || '').split('+').map((p) => (p === 'CommandOrControl' ? 'Ctrl' : p === 'Super' ? 'Win' : p)).join(' + ');
}
function keyEventToAccelerator(e) {
  const parts = [];
  if (e.ctrlKey) parts.push('Control');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  if (e.metaKey) parts.push('Super');
  if (!MODIFIER_KEYS.has(e.key)) {
    let k = KEY_LABELS[e.key] || (e.key.length === 1 ? e.key.toUpperCase() : e.key);
    parts.push(k);
  }
  return parts.join('+');
}

async function loadShortcutDisplay() {
  if (!window.clipdows.getGlobalShortcut) return;
  try {
    const { accelerator } = await window.clipdows.getGlobalShortcut();
    shortcutDisplay.textContent = acceleratorToLabel(accelerator);
  } catch { /* ignore */ }
}
loadShortcutDisplay();

async function applyNewShortcut(accelerator) {
  shortcutDisplay.classList.remove('recording');
  if (!accelerator) { loadShortcutDisplay(); return; }
  const prevLabel = shortcutDisplay.textContent;
  shortcutDisplay.textContent = acceleratorToLabel(accelerator);
  try {
    const result = await window.clipdows.setGlobalShortcut(accelerator);
    if (result.ok) {
      showToast('Shortcut updated', `Press ${acceleratorToLabel(result.accelerator)} to show or hide ClipDows`);
    } else {
      shortcutDisplay.textContent = prevLabel;
      showToast('Could not set shortcut', result.error || 'Try a different key or combination.');
    }
  } catch (err) {
    shortcutDisplay.textContent = prevLabel;
    showToast('Could not set shortcut', 'Something went wrong. Please try again.');
  }
}

$('shortcutChangeBtn').addEventListener('click', () => {
  if (shortcutDisplay.classList.contains('recording')) return;
  shortcutDisplay.classList.add('recording');
  shortcutDisplay.textContent = 'Press a key…';

  const onKeydown = (e) => {
    e.preventDefault();
    // A lone modifier (e.g. just Alt) finalizes on its own keyup below;
    // any other key finalizes immediately on keydown.
    if (!MODIFIER_KEYS.has(e.key)) {
      cleanup();
      applyNewShortcut(keyEventToAccelerator(e));
    } else {
      shortcutDisplay.textContent = acceleratorToLabel(keyEventToAccelerator(e)) + ' …';
    }
  };
  const onKeyup = (e) => {
    if (MODIFIER_KEYS.has(e.key) && shortcutDisplay.classList.contains('recording')) {
      cleanup();
      applyNewShortcut(e.key === 'Control' ? 'Control' : e.key === 'Alt' ? 'Alt' : e.key === 'Shift' ? 'Shift' : 'Super');
    }
  };
  const onBlur = () => { cleanup(); applyNewShortcut(null); };
  function cleanup() {
    window.removeEventListener('keydown', onKeydown, true);
    window.removeEventListener('keyup', onKeyup, true);
    window.removeEventListener('blur', onBlur);
  }
  window.addEventListener('keydown', onKeydown, true);
  window.addEventListener('keyup', onKeyup, true);
  window.addEventListener('blur', onBlur);
});

$('shortcutResetBtn').addEventListener('click', async () => {
  if (!window.clipdows.getGlobalShortcut) return;
  const { default: def } = await window.clipdows.getGlobalShortcut();
  applyNewShortcut(def || 'Alt');
});

document.querySelector('.settings-content').addEventListener('change', (e) => {
  const t = e.target;
  const lock = t.closest && t.closest('.plan-locked');
  if (lock) { upgradeToast(lock.dataset.feature); syncControls(); return; }
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
  if (!planInfo || !planInfo.limits.export) { upgradeToast('export'); return; }
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

// ---------- rename this computer (local display name only) ----------
const THIS_DEVICE_KEY = 'clipdows:thisDeviceName';
function loadThisDeviceName() {
  try {
    const saved = localStorage.getItem(THIS_DEVICE_KEY);
    if (saved) $('thisDeviceLabel').firstChild.textContent = saved + ' ';
  } catch { /* ignore */ }
}
$('renameThisDeviceBtn').addEventListener('click', async () => {
  const current = $('thisDeviceLabel').firstChild.textContent.trim();
  const name = await promptDialog({
    title: 'Rename this computer',
    message: 'Choose whatever name helps you tell your devices apart.',
    placeholder: 'This computer',
    value: current,
    ok: 'Save name',
  });
  if (!name) return;
  $('thisDeviceLabel').firstChild.textContent = name + ' ';
  try { localStorage.setItem(THIS_DEVICE_KEY, name); } catch { /* ignore */ }
  showToast('Renamed', `Now shown as "${name}"`);
});
loadThisDeviceName();

$('pairCancelBtn').addEventListener('click', () => { window.clipSync.cancelPairing(); showPairView(false); });
$('addDeviceBtn').addEventListener('click', async () => {
  if (!window.clipSync) { showToast('Still connecting…', 'Try again in a second.'); return; }
  const maxPhones = planInfo ? planInfo.limits.phones : 1;
  if (maxPhones >= 0) {
    let have = 0;
    try { have = (await window.clipSync.listDevices()).length; } catch (e) { /* ignore */ }
    if (have >= maxPhones) { upgradeToast('phones', maxPhones); return; }
  }
  showPairView(true);
  $('pairStatus').textContent = 'Generating your pairing code…';
  $('pairQrImg').removeAttribute('src');
  try {
    const { qrDataUrl } = await window.clipSync.beginPairing(async (device) => {
      addDeviceRow(device.uid, device.name, Date.now());
      showToast('Device connected', `${device.name} is now synced`);
      showPairView(false);
      const customName = await promptDialog({
        title: 'Name this device',
        message: 'Give it a name so you can recognize it later.',
        placeholder: device.name,
        value: device.name,
        ok: 'Save name',
      });
      if (customName && customName !== device.name && window.clipSync.renameDevice) {
        try {
          await window.clipSync.renameDevice(device.uid, customName);
          const row = devicesBody.querySelector(`.device-row[data-device="${CSS.escape(device.uid)}"] .device-info b`);
          if (row) row.textContent = customName;
        } catch (err) { console.error('[devices] could not rename device:', err); }
      }
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
// ---------- end-to-end encryption UI ----------
window.clipVaultPrompt = (mode, err) => new Promise((resolve) => {
  const m = $('vaultModal'), p1 = $('vaultPass'), p2 = $('vaultPass2'), errEl = $('vaultErr');
  const create = mode === 'create';
  $('vaultTitle').textContent = create ? 'Create your sync passphrase' : 'Unlock encrypted sync';
  $('vaultSub').textContent = create
    ? "Your clipboard is encrypted on this PC before it is uploaded. Only this passphrase can unlock it \u2014 we can't recover it for you."
    : 'Enter the passphrase you chose for this account to resume syncing.';
  p2.hidden = !create; $('vaultForgot').hidden = create;
  errEl.textContent = err || ''; p1.value = ''; p2.value = '';
  m.hidden = false; p1.focus();
  const done = (v) => { m.hidden = true; $('vaultOk').onclick = $('vaultSkip').onclick = $('vaultForgot').onclick = null; p1.onkeydown = p2.onkeydown = null; resolve(v); };
  $('vaultOk').onclick = () => {
    const pass = p1.value;
    if (create) {
      if (pass.length < 8) { errEl.textContent = 'Use at least 8 characters.'; return; }
      if (pass !== p2.value) { errEl.textContent = "The two passphrases don't match."; return; }
    } else if (!pass) return;
    done({ pass });
  };
  $('vaultSkip').onclick = () => done(null);
  $('vaultForgot').onclick = async () => {
    const ok = await confirmDialog({ title: 'Reset encryption?', message: 'Your synced clips can\u2019t be recovered without the passphrase. Resetting deletes them from the cloud so you can start fresh. Phones must be re-linked.', ok: 'Reset', danger: true });
    if (ok) done({ reset: true });
  };
  p1.onkeydown = p2.onkeydown = (e) => { if (e.key === 'Enter') $('vaultOk').click(); };
});

window.addEventListener('clipsync:crypto', (e) => {
  const on = !!(e.detail && e.detail.on);
  const b = $('e2eBadge'); b.textContent = on ? 'On' : 'Locked'; b.classList.toggle('ok', on);
  $('e2eBtn').hidden = on;
});
$('e2eBtn').addEventListener('click', () => { settingsModal.hidden = true; if (window.clipSync) window.clipSync.resumeClipSync(); });
$('purgePlainBtn').addEventListener('click', async () => {
  if (!window.clipSync) return;
  const ok = await confirmDialog({ title: 'Delete old unencrypted items?', message: 'Removes clips uploaded before encryption was on. Your local history is not touched.', ok: 'Delete', danger: true });
  if (!ok) return;
  try { const n = await window.clipSync.purgePlaintext(); showToast('Done', n ? plural(n, 'old item') + ' deleted from the cloud.' : 'Nothing to delete.'); }
  catch (err) { showToast('Could not delete', 'Check your connection and try again.'); }
});