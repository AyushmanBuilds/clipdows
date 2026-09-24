// Simulates Ctrl+V into whatever window last had focus before the popup opened.
// nut-js requires a short delay after the popup hides for focus to actually
// return to the previous app, otherwise the keystroke can land on ClipDows itself.

let keyboard, Key;
try {
  ({ keyboard, Key } = require('@nut-tree-fork/nut-js'));
  keyboard.config.autoDelayMs = 0;
} catch (err) {
  console.warn('[autoPaste] nut-js not available yet — run `npm install` and `npx electron-rebuild`.', err.message);
}

async function simulatePaste() {
  if (!keyboard) return;
  await new Promise((resolve) => setTimeout(resolve, 120));
  await keyboard.pressKey(Key.LeftControl, Key.V);
  await keyboard.releaseKey(Key.LeftControl, Key.V);
}

module.exports = { simulatePaste };