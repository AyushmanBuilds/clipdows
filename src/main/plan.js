// Plan / tier limits. -1 = unlimited. The dashboard only READS these to show or hide UI;
// real enforcement for paid features moves to Firestore rules + a Cloud Function in the payments step.
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const TRIAL_DAYS = 14;
const DAY = 86400000;

const LIMITS = {
  free: { history: 100, pinned: 5, snippets: 10, phones: 1, syncItems: 25, syncImages: false, stack: 5, ocrPerMonth: 5,
          appFilter: false, export: false, customExpiry: false, actions: 'basic', variables: false, triggers: false, timeMachine: false },
  pro:  { history: 1000, pinned: -1, snippets: 100, phones: 3, syncItems: 200, syncImages: true, stack: -1, ocrPerMonth: -1,
          appFilter: true, export: true, customExpiry: true, actions: 'full', variables: false, triggers: false, timeMachine: false },
  max:  { history: -1, pinned: -1, snippets: -1, phones: 10, syncItems: 1000, syncImages: true, stack: -1, ocrPerMonth: -1,
          appFilter: true, export: true, customExpiry: true, actions: 'full', variables: true, triggers: true, timeMachine: true },
};

let uid = null;
let state = {};   // { trialStart, paidTier, paidUntil, devTier, usage: { month, ocr } }

const file = () => path.join(app.getPath('userData'), `plan-${uid}.json`);
function save() { if (!uid) return; try { fs.writeFileSync(file(), JSON.stringify(state)); } catch { /* ignore */ } }

function load(newUid) {
  uid = newUid ? String(newUid).replace(/[^a-zA-Z0-9_-]/g, '') : null;
  state = {};
  if (!uid) return;
  try { state = JSON.parse(fs.readFileSync(file(), 'utf8')) || {}; } catch { state = {}; }
  if (!state.trialStart) { state.trialStart = Date.now(); save(); } // TODO payments step: trial start lives server-side
}

function trialDaysLeft() {
  if (!state.trialStart) return 0;
  return Math.max(0, Math.ceil((state.trialStart + TRIAL_DAYS * DAY - Date.now()) / DAY));
}

function tier() {
  if (!uid) return 'free';
  if (!app.isPackaged && state.devTier) return state.devTier;               // dev testing only
  if (state.paidTier && LIMITS[state.paidTier] && (state.paidUntil || 0) > Date.now()) return state.paidTier;
  if (trialDaysLeft() > 0) return 'pro';                                    // 14-day Pro trial
  return 'free';
}

const limits = () => LIMITS[tier()];

function info() {
  const paid = !!(state.paidTier && (state.paidUntil || 0) > Date.now());
  const t = tier();
  return {
    tier: t,
    trial: t === 'pro' && !paid && !(!app.isPackaged && state.devTier),
    trialDaysLeft: trialDaysLeft(),
    limits: LIMITS[t],
    dev: !app.isPackaged,
    devTier: state.devTier || '',
  };
}

function setDev(t) { state.devTier = LIMITS[t] ? t : ''; save(); }
function setPaid({ tier: t, expiresAt } = {}) {
  if (LIMITS[t]) { state.paidTier = t; state.paidUntil = Number(expiresAt) || 0; } else { state.paidTier = null; state.paidUntil = 0; }
  save();
}

/** Monthly OCR quota (Free = 5 scans / month). Returns true if a scan is allowed (and counts it). */
function consumeOcr() {
  const max = limits().ocrPerMonth;
  if (max < 0) return true;
  const month = new Date().toISOString().slice(0, 7);
  if (!state.usage || state.usage.month !== month) state.usage = { month, ocr: 0 };
  if (state.usage.ocr >= max) return false;
  state.usage.ocr++; save();
  return true;
}

module.exports = { load, tier, limits, info, setDev, setPaid, consumeOcr, LIMITS };
