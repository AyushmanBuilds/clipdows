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

async function simulatePaste(opts = {}) {
  if (!keyboard) return;
  if (opts.releaseModifiers) {
    // Paste-stack is triggered by a hotkey, so its modifier keys may still be physically
    // held. Release them first so the target app sees a clean Ctrl+V, not Ctrl+Alt+V.
    try {
      await keyboard.releaseKey(Key.LeftAlt, Key.RightAlt, Key.LeftShift, Key.RightShift, Key.LeftControl, Key.RightControl);
    } catch { /* ignore */ }
  }
  await new Promise((resolve) => setTimeout(resolve, opts.releaseModifiers ? 160 : 120));
  await keyboard.pressKey(Key.LeftControl, Key.V);
  await keyboard.releaseKey(Key.LeftControl, Key.V);
}

async function tapKey(k, n) {
  if (!keyboard) return;
  for (let i = 0; i < n; i++) { await keyboard.pressKey(k); await keyboard.releaseKey(k); }
}
/** Deletes the last n typed characters (used to remove a snippet trigger before expanding it). */
const backspace = (n) => tapKey(Key && Key.Backspace, n);
/** Moves the caret n characters left (used for the {cursor} snippet variable). */
const moveLeft = (n) => tapKey(Key && Key.Left, n);

module.exports = { simulatePaste, backspace, moveLeft };