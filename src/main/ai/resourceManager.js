const { createExtractor } = require('./model');

const IDLE_MS = 5 * 60 * 1000;
let extractorPromise = null;
let idleTimer = null;
let inFlight = 0;

function scheduleUnload() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (inFlight) return scheduleUnload();
    const pending = extractorPromise;
    extractorPromise = null;
    if (!pending) return;
    pending.then(async (extractor) => {
      try {
        if (typeof extractor.dispose === 'function') await extractor.dispose();
        else if (extractor.model && typeof extractor.model.dispose === 'function') await extractor.model.dispose();
      } catch (err) { console.warn('[focus] model cleanup failed:', err.message); }
    }).catch(() => {});
  }, IDLE_MS);
  if (idleTimer.unref) idleTimer.unref();
}

async function withExtractor(run) {
  clearTimeout(idleTimer);
  inFlight++;
  try {
    if (!extractorPromise) extractorPromise = createExtractor();
    const extractor = await extractorPromise;
    return await run(extractor);
  } catch (err) {
    extractorPromise = null;
    throw err;
  } finally {
    inFlight--;
    if (!inFlight) scheduleUnload();
  }
}

function unload() {
  clearTimeout(idleTimer);
  if (inFlight) return;
  const pending = extractorPromise;
  extractorPromise = null;
  if (pending) pending.then((extractor) => {
    if (typeof extractor.dispose === 'function') return extractor.dispose();
    if (extractor.model && typeof extractor.model.dispose === 'function') return extractor.model.dispose();
  }).catch(() => {});
}

module.exports = { withExtractor, unload };
