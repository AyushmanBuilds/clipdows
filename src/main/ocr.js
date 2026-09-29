// Offline OCR for image clips, so search can find text inside screenshots.
// tesseract.js runs entirely on this PC (language data is downloaded once, then cached).
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const db = require('./db');
const plan = require('./plan');

const LANG = 'eng';
const MAX_BYTES = 10 * 1024 * 1024;
const IDLE_MS = 60 * 1000;

let workerPromise = null;
let idleTimer = null;
let running = false;
const queue = [];
let notify = () => {};

/** Folder holding eng.traineddata.gz (unpacked from the asar when installed). */
function bundledLangPath() {
  const dev = path.join(__dirname, '..', '..', 'assets', 'tessdata');
  const unpacked = dev.replace('app.asar', 'app.asar.unpacked');
  if (fs.existsSync(path.join(unpacked, 'eng.traineddata.gz'))) return unpacked;
  if (fs.existsSync(path.join(dev, 'eng.traineddata.gz'))) return dev;
  return undefined; // fall back to tesseract's default (downloads once, then cached)
}

function getWorker() {
  if (!workerPromise) {
    const { createWorker } = require('tesseract.js');
    workerPromise = createWorker(LANG, 1, {
      langPath: bundledLangPath(),                       // English data ships with the app -> works fully offline
      cachePath: path.join(app.getPath('userData'), 'tessdata'),
      // Without this, a worker error (e.g. no internet) becomes an uncaught exception
      // in the main process and freezes the whole app behind an error box.
      errorHandler: (err) => console.warn('[ocr] worker error:', err),
    }).catch((err) => { workerPromise = null; throw err; });
  }
  return workerPromise;
}

function scheduleIdle() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(async () => {
    if (!workerPromise || running) return;
    const p = workerPromise; workerPromise = null;
    try { (await p).terminate(); } catch { /* ignore */ }
  }, IDLE_MS);
}

async function run(job) {
  let text = '';
  try {
    const m = /^data:image\/[\w+.-]+;base64,(.+)$/.exec(job.content || '');
    if (!m) return;
    const buf = Buffer.from(m[1], 'base64');
    if (buf.length > MAX_BYTES) { db.setOcrText(job.id, ''); return; }
    const worker = await getWorker();
    const { data } = await worker.recognize(buf);
    text = String(data.text || '').replace(/\s+/g, ' ').trim().slice(0, 20000);
  } catch (err) {
    console.warn('[ocr] failed:', err.message);
    return; // leave ocr_done unset so it can retry later
  }
  if (db.setOcrText(job.id, text) && text) notify();
}

async function pump() {
  if (running) return;
  running = true;
  try { while (queue.length) await run(queue.shift()); }
  finally { running = false; scheduleIdle(); }
}

function enqueue(item, onDone) {
  if (!item || item.type !== 'image' || !item.content) return;
  if (!plan.consumeOcr()) return; // Free plan: 5 scans a month
  if (onDone) notify = onDone;
  queue.push({ id: item.id, content: item.content });
  pump();
}

/** Index the newest not-yet-scanned screenshots (e.g. ones captured before OCR existed). */
function backfill(onDone) {
  if (plan.limits().ocrPerMonth >= 0) return; // don't burn a limited quota on old screenshots
  const pending = db.getItems({ type: 'image', limit: 30 }).filter((i) => !i.ocr_done);
  pending.forEach((i) => enqueue(i, onDone));
}

module.exports = { enqueue, backfill };