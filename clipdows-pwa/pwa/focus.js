// Browser-only account profile, Focus settings, encrypted Review sync, and PWA guide.
const $ = (id) => document.getElementById(id);
const SETTINGS_KEY = 'clipdows.settings';
const LEGACY_TOPIC_KEY = 'clipdows.focusTopics';
const LEGACY_REVIEW_KEY = 'clipdows.focusReview';
const GUIDE_KEY = 'clipdows.guideSeen';
const DAY = 24 * 60 * 60 * 1000;
const TOMBSTONE_MS = 30 * DAY;
const TOPICS = [
  ['programming','Programming','Technology'],['ai','AI & machine learning','Technology'],['data','Data & analytics','Technology'],['security','Cybersecurity','Technology'],['design','Design & creative','Technology'],
  ['work','Work & projects','Career & business'],['career','Career & job search','Career & business'],['marketing','Marketing','Career & business'],['sales','Sales & customers','Career & business'],['productivity','Productivity','Career & business'],
  ['finance','Finance & budgeting','Money & planning'],['investing','Investing & markets','Money & planning'],['shopping','Shopping & products','Money & planning'],['realestate','Real estate','Money & planning'],
  ['research','Research & papers','Knowledge'],['learning','Learning & courses','Knowledge'],['writing','Writing & editing','Knowledge'],['news','News & current events','Knowledge'],['legal','Legal & contracts','Knowledge'],
  ['personal','Personal notes','Everyday life'],['health','Health & wellness','Everyday life'],['cooking','Food & cooking','Everyday life'],['home','Home & DIY','Everyday life'],['family','Family & caregiving','Everyday life'],['travel','Travel & places','Everyday life'],['entertainment','Books & entertainment','Everyday life']
];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safePhoto = (s) => typeof s === 'string' && /^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(s) && s.length <= 350000 ? s : '';
const app = () => window.ClipDowsApp;
const pair = () => app()?.getPairing?.() || null;
const ownerUid = () => pair()?.ownerUid || '';
const plan = () => app()?.getPlan?.() || { tier: 'free' };
const accountKey = (base) => base + '.' + (ownerUid() || 'unpaired');
const readSettings = () => { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch { return {}; } };
let activeUid = '';
let focusState = { focusEnabled: false, focusTopics: [], focusCustomTopics: [], updatedAt: 0 };
let profileUnsub = null, focusUnsub = null, reviewUnsub = null;
let reviewState = { rows: [], tombstones: [] };
let reviewDocs = [];
let reviewReadGeneration = 0;
let reviewVersions = new Map();
let reviewWriteTimer = null, reviewWriteRunning = false, reviewWriteAgain = false;
let cropSource = null, cropZoom = 1, cropX = 0, cropY = 0, cropPointer = null;
let cropCanvas = null, cropCtx = null;

function loadFocusState(uid) {
  let state = null;
  try { state = JSON.parse(localStorage.getItem('clipdows.focusSettings.v1.' + uid) || 'null'); } catch { state = null; }
  if (!state) {
    let oldTopics = [];
    try { oldTopics = JSON.parse(localStorage.getItem(LEGACY_TOPIC_KEY) || '[]'); } catch { /* empty */ }
    const old = readSettings();
    state = { focusEnabled: !!old.focusEnabled, focusTopics: oldTopics, focusCustomTopics: [], updatedAt: 0 };
    try { localStorage.removeItem(LEGACY_TOPIC_KEY); } catch { /* optional migration cleanup */ }
  }
  focusState = {
    focusEnabled: !!state.focusEnabled,
    focusTopics: Array.isArray(state.focusTopics) ? [...new Set(state.focusTopics.filter((x) => typeof x === 'string'))] : [],
    focusCustomTopics: Array.isArray(state.focusCustomTopics) ? state.focusCustomTopics.filter((x) => x && typeof x.id === 'string' && typeof x.label === 'string' && typeof x.prompt === 'string').map((x) => ({id:x.id.slice(0,80),label:x.label.slice(0,40),prompt:x.prompt.slice(0,240)})) : [],
    updatedAt: Number(state.updatedAt) || 0
  };
}
function persistFocusState(writeCloud) {
  focusState.updatedAt = Math.max(Date.now(), (Number(focusState.updatedAt) || 0) + 1);
  try { localStorage.setItem('clipdows.focusSettings.v1.' + ownerUid(), JSON.stringify(focusState)); } catch { /* Firestore remains the shared copy */ }
  const settings = readSettings(); settings.focusEnabled = focusState.focusEnabled;
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* optional legacy mirror */ }
  if (writeCloud && app()?.writeSharedDoc && ownerUid()) app().writeSharedDoc('focusSettings', { focusCapture: focusState.focusEnabled, focusTopics: focusState.focusTopics, focusCustomTopics: focusState.focusCustomTopics, updatedAt: focusState.updatedAt }).catch((e) => toast('Focus settings saved here', e.message || 'Could not sync right now'));
  renderFocus();
}
function activeTopicCount() { return focusState.focusTopics.length + focusState.focusCustomTopics.length; }
function focusLimit() { return plan().tier === 'max' ? 16 : plan().tier === 'pro' ? 8 : 0; }
function renderFocus() {
  const mount = $('focusMount'); if (!mount) return;
  const p = plan(), cap = focusLimit(), active = cap > 0 && focusState.focusEnabled;
  document.documentElement.dataset.plan = p.tier;
  const grouped = [...new Set(TOPICS.map((t) => t[2]))];
  const groupsHtml = grouped.map((g) => '<optgroup label="' + esc(g) + '">' + TOPICS.filter((t) => t[2] === g && !focusState.focusTopics.includes(t[0])).map((t) => '<option value="' + esc(t[0]) + '">' + esc(t[1]) + '</option>').join('') + '</optgroup>').join('');
  const selectedHtml = focusState.focusTopics.map((id) => { const t = TOPICS.find((x) => x[0] === id); return '<span class="focus-topic">' + esc(t ? t[1] : id) + '<button type="button" data-remove-topic="' + esc(id) + '" aria-label="Remove topic">×</button></span>'; }).join('') + focusState.focusCustomTopics.map((t) => '<span class="focus-topic custom"><span>' + esc(t.label) + '</span><button type="button" data-remove-custom="' + esc(t.id) + '" aria-label="Remove custom topic">×</button></span>').join('');
  mount.innerHTML = '<div class="settings-group focus-settings"><h4>AI Focus <span class="focus-status">' + (active ? 'On' : 'Off') + '</span></h4>' +
    '<label class="settings-row tog"><span><span class="label">AI Focus on Windows' + (cap ? '' : ' <em class="tier-tag">Pro</em>') + '</span><small>' + (cap ? 'Your topics and on/off state sync with your Windows account.' : 'AI Focus is available on Pro and Max.') + '</small></span><input type="checkbox" id="focusToggle" ' + (focusState.focusEnabled ? 'checked' : '') + (cap || focusState.focusEnabled ? '' : ' disabled') + '><i></i></label>' +
    '<div class="settings-row focus-model-note"><span><span class="label">PWA capture</span><small>Browser clipboard capture needs a user action or foreground access. Topic classification runs on Windows; the PWA does not monitor the clipboard in the background.</small></span></div>' +
    '<label class="settings-row tog"><span><span class="label">Review notifications</span><small>' + (window.Notification ? 'Reminder after 24 hours; expiry after 48 hours.' : 'Notifications are not supported in this browser.') + '</small></span><input type="checkbox" id="reviewNotifications" ' + (readSettings().reviewNotifications ? 'checked' : '') + (window.Notification ? '' : ' disabled') + '><i></i></label>' +
    '<div class="focus-topics"><div class="focus-topics-head"><span class="label">Topics</span><span class="value">' + activeTopicCount() + ' / ' + cap + '</span></div>' +
    '<div class="focus-topic-list">' + (selectedHtml || (cap ? '<small>No topics selected</small>' : '<small>Upgrade to Pro to add topics</small>')) + '</div>' +
    '<div class="focus-topic-add" ' + (cap ? '' : 'hidden') + '><select id="topicChoice" aria-label="Choose a topic"><option value="">Choose a topic</option>' + groupsHtml + '</select><input id="customTopic" maxlength="40" placeholder="Custom topic name" aria-label="Custom topic name"><input id="customPrompt" maxlength="240" placeholder="Describe what belongs here" aria-label="Custom topic description"><button class="card-action" id="addTopic" type="button">Add</button></div></div>' +
    '<div class="settings-row focus-review-row"><span><span class="label">Focus Review</span><small id="reviewCount">Encrypted review items sync with Windows. Items expire after 48 hours.</small></span><button class="card-action" id="reviewOpen" type="button">Open</button></div></div><div class="focus-review-list" id="reviewList" hidden></div>';
  const toggle = $('focusToggle'); if (toggle) toggle.onchange = async (e) => {
    if (e.target.checked && !app()?.cryptoReady?.() && reviewItems().length) toast('Review sync is locked', 'Unlock sync with your Windows passphrase to sync review items.');
    focusState.focusEnabled = e.target.checked; persistFocusState(true);
  };
  const notif = $('reviewNotifications'); if (notif) notif.onchange = async (e) => {
    const settings = readSettings();
    if (e.target.checked && Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { e.target.checked = false; toast('Notifications not enabled', 'Allow notifications in your browser settings to use reminders'); return; }
    }
    settings.reviewNotifications = e.target.checked; localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  };
  mount.querySelectorAll('[data-remove-topic]').forEach((b) => b.onclick = () => { focusState.focusTopics = focusState.focusTopics.filter((t) => t !== b.dataset.removeTopic); persistFocusState(true); });
  mount.querySelectorAll('[data-remove-custom]').forEach((b) => b.onclick = () => { focusState.focusCustomTopics = focusState.focusCustomTopics.filter((t) => t.id !== b.dataset.removeCustom); persistFocusState(true); });
  const add = $('addTopic'); if (add) add.onclick = () => {
    const choice = $('topicChoice').value, label = $('customTopic').value.trim().replace(/\s+/g, ' '), prompt = $('customPrompt').value.trim().replace(/\s+/g, ' ');
    if (activeTopicCount() >= cap) { toast('Topic limit reached', 'Your ' + p.tier + ' plan allows ' + cap + ' topics.'); return; }
    if (choice) focusState.focusTopics.push(choice);
    else if (label && prompt) focusState.focusCustomTopics.push({ id:'custom-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8), label:label.slice(0,40), prompt:prompt.slice(0,240) });
    else { toast('Add a topic', 'Choose a topic or enter a custom name and description.'); return; }
    persistFocusState(true);
  };
  const reviewButton = $('reviewOpen'); if (reviewButton) reviewButton.onclick = () => { const box = $('reviewList'); box.hidden = !box.hidden; renderReview(); };
  renderReview(); renderHeaderToggle();
}
function renderHeaderToggle() {
  const b = $('focusHeaderToggle'); if (!b) return;
  const cap = focusLimit(), active = cap > 0 && focusState.focusEnabled;
  b.disabled = !cap && !focusState.focusEnabled; b.classList.toggle('is-on', active); b.classList.toggle('is-locked', !cap);
  b.setAttribute('aria-pressed', String(active)); b.setAttribute('aria-label', cap ? 'AI Focus is ' + (active ? 'on' : 'off') : (focusState.focusEnabled ? 'AI Focus is on; toggle to turn it off' : 'AI Focus is a Pro feature'));
  const status = b.querySelector('[data-header-focus-status]'); if (status) status.textContent = cap ? (active ? 'On' : 'Off') : (focusState.focusEnabled ? 'On' : 'Pro');
}
function bindFocusSettings(uid) {
  if (focusUnsub) focusUnsub(); focusUnsub = null;
  if (!uid || !app()?.watchSharedDoc) return;
  focusUnsub = app().watchSharedDoc('focusSettings', (remote, meta) => {
    if (activeUid !== uid) return;
    if (!remote) { if (!meta?.fromCache) persistFocusState(true); return; }
    const at = Number(remote.updatedAt) || 0;
    if (at > focusState.updatedAt) {
      focusState = { focusEnabled:!!remote.focusCapture, focusTopics:Array.isArray(remote.focusTopics)?remote.focusTopics.filter((x)=>typeof x==='string'):[], focusCustomTopics:Array.isArray(remote.focusCustomTopics)?remote.focusCustomTopics.filter((x)=>x&&typeof x.id==='string'&&typeof x.label==='string'&&typeof x.prompt==='string').map((x)=>({id:x.id,label:x.label,prompt:x.prompt})):[], updatedAt:at };
      try { localStorage.setItem('clipdows.focusSettings.v1.' + uid, JSON.stringify(focusState)); } catch { /* remote remains canonical */ }
      const settings = readSettings(); settings.focusEnabled = focusState.focusEnabled; try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* optional */ }
      renderFocus();
    } else if (focusState.updatedAt > at && !meta?.fromCache) persistFocusState(true);
  }, (err) => console.warn('[focus] settings sync failed:', err.message));
}

function reviewKey(uid) { return 'clipdows.focusReview.v2.' + (uid || 'unpaired'); }
function normalizeReviewState(raw) {
  if (Array.isArray(raw)) return { rows:raw.filter((x)=>x&&x.id&&typeof x.content==='string').map((x)=>({...x,updated_at:Number(x.updated_at)||Number(x.reviewedAt)||Date.now(),expires_at:Number(x.expires_at)||Number(x.expiresAt)||Date.now()+2*DAY,reviewed_at:Number(x.reviewed_at)||Number(x.createdAt)||Date.now(),reminded_at:Number(x.reminded_at)||0})), tombstones:[] };
  return { rows:Array.isArray(raw?.rows)?raw.rows.filter((x)=>x&&typeof x.id==='string'&&typeof x.content==='string'):[], tombstones:Array.isArray(raw?.tombstones)?raw.tombstones.filter((x)=>x&&typeof x.id==='string'&&Number(x.deleted_at)>0):[] };
}
function loadReviewState(uid) {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(reviewKey(uid)) || 'null'); } catch { raw = null; }
  if (!raw && uid) {
    try { raw = JSON.parse(localStorage.getItem(LEGACY_REVIEW_KEY) || 'null'); if (raw) { localStorage.setItem(reviewKey(uid), JSON.stringify(raw)); localStorage.removeItem(LEGACY_REVIEW_KEY); } } catch { /* empty */ }
  }
  reviewState = normalizeReviewState(raw);
  sweepReview(false);
}
function saveReviewState(sync = true) {
  if (activeUid) { try { localStorage.setItem(reviewKey(activeUid), JSON.stringify(reviewState)); } catch { toast('Review queue is full', 'Remove an item to free local storage.'); } }
  if (sync) scheduleReviewSync();
}
function tombstone(id, at = Date.now()) {
  const old = reviewState.tombstones.find((x) => x.id === String(id));
  if (old) old.deleted_at = Math.max(Number(old.deleted_at)||0, at); else reviewState.tombstones.push({id:String(id),deleted_at:at});
}
function sweepReview(sync = true) {
  const now = Date.now(), before = reviewState.rows.length, beforeMarks = reviewState.tombstones.length;
  reviewState.rows = reviewState.rows.filter((x) => { if (Number(x.expires_at) > now) return true; tombstone(x.id, now); return false; });
  const cutoff = now - TOMBSTONE_MS; reviewState.tombstones = reviewState.tombstones.filter((x) => Number(x.deleted_at) >= cutoff);
  if (reviewState.rows.length !== before || reviewState.tombstones.length !== beforeMarks) saveReviewState(sync);
}
function reviewItems() { sweepReview(true); return reviewState.rows.slice().sort((a,b)=>(Number(b.reviewed_at)||0)-(Number(a.reviewed_at)||0)); }
function mergeReview(remoteRows, remoteMarks) {
  let changed = false;
  for (const mark of remoteMarks) {
    const at = Number(mark.deleted_at)||0, local = reviewState.rows.find((x)=>x.id===mark.id);
    if (local && at < (Number(local.updated_at)||Number(local.reviewed_at)||0)) { reviewState.tombstones=reviewState.tombstones.filter((x)=>x.id!==mark.id); continue; }
    const old = reviewState.tombstones.find((x)=>x.id===mark.id);
    if (!old || Number(old.deleted_at)<at) { tombstone(mark.id,at); changed=true; }
    if (local && at >= (Number(local.updated_at)||Number(local.reviewed_at)||0)) { reviewState.rows=reviewState.rows.filter((x)=>x.id!==mark.id); changed=true; }
  }
  for (const remote of remoteRows) {
    if (!remote || typeof remote.id!=='string' || typeof remote.content!=='string' || Number(remote.expires_at)<=Date.now()) continue;
    const mark=reviewState.tombstones.find((x)=>x.id===remote.id), at=Number(remote.updated_at)||Number(remote.reviewed_at)||0;
    if (mark && Number(mark.deleted_at)>=at) continue;
    const i=reviewState.rows.findIndex((x)=>x.id===remote.id);
    if (i>=0 && (Number(reviewState.rows[i].updated_at)||Number(reviewState.rows[i].reviewed_at)||0)>=at) continue;
    if (i>=0) reviewState.rows[i]=remote; else reviewState.rows.push(remote);
    reviewState.tombstones=reviewState.tombstones.filter((x)=>x.id!==remote.id); changed=true;
  }
  if (changed) saveReviewState(false);
}
async function readRemoteReviewDocs(docs) {
  const generation = ++reviewReadGeneration;
  reviewDocs = docs || [];
  if (!app()?.cryptoReady?.()) return;
  const rows=[], marks=[]; reviewVersions=new Map();
  for (const d of reviewDocs) {
    const id=String(d.reviewId||''); if (!id) continue;
    const deleted=Number(d.deleted_at)||0;
    if (deleted) { if (Date.now()-deleted > TOMBSTONE_MS) { app().deleteFocusReviewRecord?.(id).catch(()=>{}); continue; } marks.push({id,deleted_at:deleted}); reviewVersions.set(id,-deleted); continue; }
    const version=Number(d.updated_at)||0; reviewVersions.set(id,version);
    if (!d.payload) continue;
    try { const row=await app().decryptSyncPayload(d.payload); if (row?.id === id) rows.push(row); }
    catch (e) { console.warn('[focus] could not decrypt review clip:', e.message); }
  }
  if (generation !== reviewReadGeneration || activeUid !== ownerUid()) return;
  mergeReview(rows.filter((row) => row && typeof row.id === 'string' && reviewDocs.some((d) => d.reviewId === row.id)),marks); renderReview(); scheduleReviewSync(150);
}
function bindReviewCloud(uid) {
  if (reviewUnsub) reviewUnsub(); reviewUnsub=null; reviewVersions=new Map();
  if (!uid || !app()?.watchFocusReview) return;
  reviewUnsub=app().watchFocusReview((docs)=>{ readRemoteReviewDocs(docs); },(err)=>console.warn('[focus] review sync failed:',err.message));
}
async function flushReviewSync() {
  if (reviewWriteRunning) { reviewWriteAgain=true; return; }
  if (!activeUid || !app()?.cryptoReady?.() || ownerUid()!==activeUid || !app()?.writeFocusReviewRecord) return;
  reviewWriteRunning=true;
  try {
    sweepReview(false);
    for (const row of reviewState.rows) {
      const v=Number(row.updated_at)||Number(row.reviewed_at)||Date.now(); if (reviewVersions.get(row.id)===v) continue;
      const payload=await app().encryptSyncPayload(row);
      if (ownerUid()!==activeUid) return;
      await app().writeFocusReviewRecord({kind:'focusReview',reviewId:String(row.id),updated_at:v,expires_at:Number(row.expires_at),payload});
      reviewVersions.set(row.id,v);
    }
    for (const mark of reviewState.tombstones) {
      if (ownerUid()!==activeUid) return;
      const v=Number(mark.deleted_at)||Date.now(); if (reviewVersions.get(mark.id)===-v) continue;
      await app().writeFocusReviewRecord({kind:'focusReview',reviewId:String(mark.id),updated_at:v,deleted_at:v});
      reviewVersions.set(mark.id,-v);
    }
  } catch (e) { console.warn('[focus] encrypted review sync failed:',e.message); if (navigator.onLine) scheduleReviewSync(10000); }
  finally { reviewWriteRunning=false; if(reviewWriteAgain){reviewWriteAgain=false;scheduleReviewSync(200);} }
}
function scheduleReviewSync(delay=500) { clearTimeout(reviewWriteTimer); reviewWriteTimer=setTimeout(flushReviewSync,delay); }
function addReview(item) {
  if (!item || item.type==='image' || !item.content) { toast('Review unavailable','Only text clips can be saved for review'); return; }
  const rows=reviewItems(); if(rows.some((x)=>x.id===item.id)){toast('Already in review','This clip is in your Focus Review');return;}
  const now=Math.max(Date.now(),(Number(reviewState.rows[0]?.updated_at)||0)+1); reviewState.rows.unshift({id:String(item.id),content:String(item.content).slice(0,12000),preview:String(item.preview||item.content).slice(0,500),type:item.type||'text',created_at:item.created_at||now,reviewed_at:now,updated_at:now,expires_at:now+2*DAY,reminded_at:0,source_app:item.source_app||null,source_path:item.source_path||null});
  reviewState.tombstones=reviewState.tombstones.filter((x)=>x.id!==String(item.id)); saveReviewState(true); toast('Added to Focus Review',app()?.cryptoReady?.()?'Encrypted and syncing with Windows':'Saved here; unlock sync to send it to Windows'); renderReview();
}
function renderReview() {
  const list=$('reviewList'); if(!list)return;
  const rows=reviewItems(), now=Date.now(), due=rows.filter((x)=>!Number(x.reminded_at)&&now-(Number(x.reviewed_at)||now)>=DAY);
  if(due.length){for(const x of due){x.reminded_at=now;x.updated_at=Math.max(now,(Number(x.updated_at)||0)+1);}saveReviewState(true);toast('Focus Review reminder',due.length+' clip'+(due.length===1?' is':'s are')+' ready to revisit');if(readSettings().reviewNotifications&&window.Notification?.permission==='granted')new Notification('ClipDows Focus Review',{body:due.length+' clip'+(due.length===1?' is':'s are')+' waiting before expiry.'});}
  const count=$('reviewCount');if(count){const unlocked=!!app()?.cryptoReady?.();count.textContent=rows.length+' saved · '+(unlocked?'encrypted sync is ready':'unlock sync on Windows with your passphrase to sync these clips')+' · expires after 48 hours';}
  list.innerHTML=rows.length?rows.map((x)=>'<article class="review-card"><div><strong>'+esc(x.type)+'</strong><p>'+esc(x.preview)+'</p><small>Expires '+new Date(x.expires_at).toLocaleString()+'</small></div><div class="review-actions"><button class="card-action" data-copy-review="'+esc(x.id)+'">Copy</button><button class="card-action danger" data-remove-review="'+esc(x.id)+'">Remove</button></div></article>').join(''):'<div class="empty-state">No clips in Focus Review</div>';
  list.querySelectorAll('[data-remove-review]').forEach((b)=>b.onclick=()=>{const id=b.dataset.removeReview;reviewState.rows=reviewState.rows.filter((x)=>x.id!==id);tombstone(id);saveReviewState(true);renderReview();});
  list.querySelectorAll('[data-copy-review]').forEach((b)=>b.onclick=async()=>{const x=rows.find((y)=>y.id===b.dataset.copyReview);try{await navigator.clipboard.writeText(x.content);toast('Copied','Focus Review clip copied');}catch{toast('Copy failed','Allow clipboard access and try again');}});
}
function renderProfile() {
  const mount=$('profileMount');if(!mount)return;
  const photo=safePhoto(localStorage.getItem(accountKey('clipdows.profilePhoto'))||'');
  mount.innerHTML='<div class="settings-group profile-group"><h4>Profile picture</h4><div class="profile-editor"><button type="button" class="profile-avatar" id="profileAvatar" aria-label="Choose profile picture">'+(photo?'<img src="'+photo+'" alt="Profile picture">':'CD')+'</button><div class="profile-controls"><label class="card-action profile-upload" for="profileFile">Upload picture</label><input id="profileFile" type="file" accept="image/*" hidden><label class="profile-zoom-label" for="profileZoom">Crop / zoom</label><input type="range" id="profileZoom" min="1" max="3" step="0.05" value="1"><button class="primary-btn" id="profileSave" type="button" disabled>Save picture</button><button class="ghost-btn" id="profileRemove" type="button" '+(photo?'':'disabled')+'>Remove picture</button></div></div><div class="profile-crop-wrap"><canvas id="profileCrop" width="256" height="256" aria-label="Drag to choose the circular crop"></canvas><small>Drag the preview and adjust zoom, then save.</small></div><small class="profile-note">Synced to your paired Windows account.</small></div>';
  cropCanvas=$('profileCrop');cropCtx=cropCanvas.getContext('2d');cropSource=null;cropZoom=1;cropX=0;cropY=0;
  $('profileAvatar').onclick=()=>$('profileFile').click();
  $('profileFile').onchange=async(e)=>{const file=e.target.files?.[0];if(!file)return;if(!file.type.startsWith('image/')){toast('Choose an image file');return;}try{cropSource=await createImageBitmap(file);cropZoom=1;cropX=0;cropY=0;$('profileZoom').value='1';$('profileSave').disabled=false;drawCrop();}catch{toast('Could not open image','Try another photo.');}};
  $('profileZoom').oninput=(e)=>{cropZoom=Number(e.target.value)||1;drawCrop();};
  cropCanvas.onpointerdown=(e)=>{cropPointer={x:e.clientX,y:e.clientY,ox:cropX,oy:cropY};cropCanvas.setPointerCapture(e.pointerId);};
  cropCanvas.onpointermove=(e)=>{if(!cropPointer)return;const r=cropCanvas.getBoundingClientRect(),s=256/r.width;cropX=cropPointer.ox+(e.clientX-cropPointer.x)*s;cropY=cropPointer.oy+(e.clientY-cropPointer.y)*s;drawCrop();};
  cropCanvas.onpointerup=()=>{cropPointer=null;};cropCanvas.onpointercancel=()=>{cropPointer=null;};
  $('profileSave').onclick=async()=>{if(!cropSource||!activeUid)return;const photo=cropCanvas.toDataURL('image/webp',.84);if(photo.length>350000){toast('Photo is too large to sync','Choose a simpler image and try again.');return;}const at=Date.now();localStorage.setItem(accountKey('clipdows.profilePhoto'),photo);localStorage.setItem(accountKey('clipdows.profilePhotoUpdated'),String(at));applyProfilePhoto(photo);try{await app().writeSharedDoc('profile',{photoDataUrl:photo,updatedAt:at});toast('Profile picture updated','Synced with your paired Windows account.');}catch(err){toast('Photo saved on this device',err.message||'Could not sync right now.');}};
  $('profileRemove').onclick=async()=>{const at=Date.now();localStorage.removeItem(accountKey('clipdows.profilePhoto'));localStorage.setItem(accountKey('clipdows.profilePhotoUpdated'),String(at));applyProfilePhoto('');try{await app().writeSharedDoc('profile',{photoDataUrl:'',updatedAt:at});toast('Profile picture removed','Removal synced to your Windows account.');}catch(err){toast('Could not sync removal',err.message||'Try again.');}renderProfile();};
  if(activeUid)bindProfileCloud(activeUid);
}
function drawCrop(){if(!cropCtx||!cropCanvas)return;cropCtx.clearRect(0,0,256,256);if(!cropSource)return;const scale=Math.max(256/cropSource.width,256/cropSource.height)*cropZoom,w=cropSource.width*scale,h=cropSource.height*scale;const minX=256-w,maxX=0,minY=256-h,maxY=0;cropX=Math.min(maxX,Math.max(minX,cropX));cropY=Math.min(maxY,Math.max(minY,cropY));cropCtx.drawImage(cropSource,cropX,cropY,w,h);}
function applyProfilePhoto(photo){photo=safePhoto(photo);const b=$('deviceAvatar');if(b){if(photo)b.innerHTML='<img src="'+photo+'" alt="">';else b.textContent=(pair()?.deviceName||'A')[0].toUpperCase();}const a=$('profileAvatar');if(a){a.innerHTML=photo?'<img src="'+photo+'" alt="Profile picture">':'CD';}}
function bindProfileCloud(uid){if(profileUnsub)profileUnsub();profileUnsub=null;if(!uid||!app()?.watchSharedDoc)return;profileUnsub=app().watchSharedDoc('profile',(remote,meta)=>{if(activeUid!==uid)return;if(!remote){if(!meta?.fromCache){const photo=safePhoto(localStorage.getItem(accountKey('clipdows.profilePhoto'))||'');app().writeSharedDoc('profile',{photoDataUrl:photo,updatedAt:Number(localStorage.getItem(accountKey('clipdows.profilePhotoUpdated')))||Date.now()}).catch((e)=>toast('Profile is local for now',e.message));}return;}const remoteAt=Number(remote.updatedAt)||0,localAt=Number(localStorage.getItem(accountKey('clipdows.profilePhotoUpdated'))) || 0;if(remoteAt<localAt){if(!meta?.fromCache)app().writeSharedDoc('profile',{photoDataUrl:safePhoto(localStorage.getItem(accountKey('clipdows.profilePhoto'))||''),updatedAt:localAt}).catch(()=>{});return;}const photo=safePhoto(remote.photoDataUrl||'');if(photo)localStorage.setItem(accountKey('clipdows.profilePhoto'),photo);else localStorage.removeItem(accountKey('clipdows.profilePhoto'));localStorage.setItem(accountKey('clipdows.profilePhotoUpdated'),String(remoteAt));applyProfilePhoto(photo);},(e)=>console.warn('[focus] profile sync failed:',e.message));}
function bindAccount(uid){if(activeUid===uid)return;if(profileUnsub)profileUnsub();if(focusUnsub)focusUnsub();if(reviewUnsub)reviewUnsub();profileUnsub=focusUnsub=reviewUnsub=null;activeUid=uid||'';if(!activeUid){focusState={focusEnabled:false,focusTopics:[],focusCustomTopics:[],updatedAt:0};reviewState={rows:[],tombstones:[]};applyProfilePhoto('');renderFocus();return;}loadFocusState(activeUid);loadReviewState(activeUid);bindProfileCloud(activeUid);bindFocusSettings(activeUid);bindReviewCloud(activeUid);renderProfile();renderFocus();}

const GUIDE=[["Your clipboard, together","Clips from your paired Windows PC appear in this feed. The PWA can’t watch system clipboard changes continuously."],["Capture when you choose","Tap the lightning button or use the capture setting. Browsers require a user action or permission for clipboard access."],["Send and review","Save text clips to Focus Review; encrypted review entries sync with Windows and expire after 48 hours."],["Make it yours","Your profile picture and AI Focus preferences sync with your paired Windows account. The guide can be restarted from Settings."]];
let guideIndex=0;
function showGuide(){guideIndex=0;$('guideOverlay').hidden=false;drawGuide();}
function drawGuide(){$('guideStep').textContent='ClipDows Guide · '+(guideIndex+1)+' of '+GUIDE.length;$('guideTitle').textContent=guideIndex===0?'Welcome to ClipDows':GUIDE[guideIndex][0];$('guideText').textContent=GUIDE[guideIndex][1];$('guideNext').textContent=guideIndex===GUIDE.length-1?'Done':'Next';}
function closeGuide(){ $('guideOverlay').hidden=true;try{localStorage.setItem(GUIDE_KEY+'.'+(activeUid||'device'),'1');}catch{}}
$('guideNext')?.addEventListener('click',()=>{if(++guideIndex>=GUIDE.length)closeGuide();else drawGuide();});
$('guideSkip')?.addEventListener('click',closeGuide);$('restartGuide')?.addEventListener('click',showGuide);
function toast(title,sub){const t=$('toast');if(!t)return;$('toastTitle').textContent=title;$('toastSub').textContent=sub||'';t.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>{t.hidden=true;},3000);}
function attachReviewAction(card){if(card.dataset.reviewBound||!card.classList.contains('card'))return;card.dataset.reviewBound='1';const id=card.dataset.id,item=app()?.getLatest?.().find((x)=>String(x.id)===id);if(!item||item.type==='image')return;const row=card.querySelector('.card-row-actions');if(!row)return;const b=document.createElement('button');b.className='card-action';b.textContent='Review';b.onclick=()=>addReview(item);row.append(b);}
new MutationObserver((records)=>records.forEach((r)=>r.addedNodes.forEach((n)=>{if(n.nodeType!==1)return;if(n.matches?.('.card'))attachReviewAction(n);n.querySelectorAll?.('.card').forEach(attachReviewAction);}))).observe(document.body,{childList:true,subtree:true});
$('focusHeaderToggle')?.addEventListener('click',()=>{if(!focusLimit()&&!focusState.focusEnabled){toast('AI Focus needs Pro','Open Settings to review plans.');return;}if(!focusState.focusEnabled&&!activeTopicCount()){toast('Choose a Focus topic','Select topics in Settings first.');return;}focusState.focusEnabled=!focusState.focusEnabled;persistFocusState(true);});
window.addEventListener('clipdows:plan',renderFocus);
window.addEventListener('clipdows:pairingChanged',(e)=>bindAccount(e.detail?.ownerUid||''));
window.addEventListener('clipdows:crypto',(e)=>{if(e.detail?.ready)readRemoteReviewDocs(reviewDocs);renderReview();});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){sweepReview(true);renderReview();}});
setInterval(()=>{sweepReview(true);renderReview();},60000);
document.addEventListener('DOMContentLoaded',()=>{
  renderProfile();renderFocus();bindAccount(ownerUid());
  const b=$('focusHeaderToggle');if(b){const st=b.querySelector('[data-header-focus-status]');if(st)st.textContent=focusState.focusEnabled?'On':'Off';}
  if(!localStorage.getItem(GUIDE_KEY+'.'+(ownerUid()||'device'))){const timer=setInterval(()=>{if(!$('appShell').hidden){clearInterval(timer);setTimeout(()=>{if(!localStorage.getItem(GUIDE_KEY+'.'+(ownerUid()||'device')))showGuide();},350);}},300);setTimeout(()=>clearInterval(timer),30000);}
});
window.ClipDowsFocus={applyProfilePhoto:()=>applyProfilePhoto(localStorage.getItem(accountKey('clipdows.profilePhoto'))||''),renderFocus};
