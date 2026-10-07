// Runs automatically before every `firebase deploy` (see firebase.json "predeploy").
// Stamps a fresh build id so every installed phone detects and installs the update.
const fs = require("fs");
const id = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
fs.writeFileSync("pwa/version.json", JSON.stringify({ build: id, at: new Date().toISOString() }) + "\n");
const p = "pwa/service-worker.js";
const s = fs.readFileSync(p, "utf8");
if (!/const BUILD_ID = "[^"]*";/.test(s)) { console.error("BUILD_ID line not found in " + p); process.exit(1); }
fs.writeFileSync(p, s.replace(/const BUILD_ID = "[^"]*";/, `const BUILD_ID = "${id}";`));
for (const f of ["pwa/index.html", "pwa/pair.html"]) {
  const h = fs.readFileSync(f, "utf8");
  fs.writeFileSync(f, h.replace(/(\/(?:style\.css|app\.js|premium\.js))(\?v=[^"']*)?(["'])/g, "$1?v=" + id + "$3"));
}
console.log("ClipDows build stamped:", id);