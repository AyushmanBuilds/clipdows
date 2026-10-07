// Shared, in-memory copy of the settings the main process cares about.
// The dashboard pushes them via `settings:apply` (on load and on every change).
const prefs = {
  guard: true,        // sensitive-data guard
  sourceApp: true,    // record which app a clip came from
  ocr: true,          // OCR text extraction for image clips
  secretTtl: 0,       // ms; 0 = default (60s for OTPs, 120s for other secrets)
  ignoredApps: [],    // lowercase fragments, e.g. ['keepass', '1password']
  focusCapture: false,
  focusTopics: [],
  focusCustomTopics: [],
  set(s = {}) {
    if (typeof s.guard === 'boolean') this.guard = s.guard;
    if (typeof s.sourceApp === 'boolean') this.sourceApp = s.sourceApp;
    if (typeof s.ocr === 'boolean') this.ocr = s.ocr;
    if (typeof s.focusCapture === 'boolean') this.focusCapture = s.focusCapture;
    if (Array.isArray(s.focusTopics)) this.focusTopics = [...new Set(s.focusTopics.filter((x) => typeof x === 'string'))];
    if (Array.isArray(s.focusCustomTopics)) this.focusCustomTopics = s.focusCustomTopics
      .filter((topic) => topic && typeof topic.id === 'string' && typeof topic.label === 'string' && typeof topic.prompt === 'string')
      .map((topic) => ({ id: topic.id, label: topic.label.slice(0, 40), prompt: topic.prompt.slice(0, 240) }));
    if (s.secretTtl != null) this.secretTtl = (Number(s.secretTtl) || 0) * 1000;
    if (typeof s.ignoredApps === 'string') {
      this.ignoredApps = s.ignoredApps.split(/[,\n;]+/).map((x) => x.trim().toLowerCase().replace(/\.exe$/, '')).filter(Boolean);
    }
  },
};
module.exports = prefs;
