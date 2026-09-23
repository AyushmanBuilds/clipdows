# ClipDows

Copy Anywhere. Access Everywhere.

## What's built (Phase 1)
- Global hotkey `Win+Shift+V` → toggles the floating popup near your cursor
- Live clipboard watcher (text, links, code, images auto-detected) → SQLite
- Popup UI: search, type tabs, keyboard nav (1-5 / ↑↓ / Enter / Esc)
- Click or number-key an item → writes to clipboard + auto-pastes (Ctrl+V) into the app you were just in
- Tray icon with a menu + click-to-toggle

## Not built yet
- Main dashboard window, item detail view, settings, login/onboarding, snippets UI, connected devices, cross-device sync (Firebase). These come next per the phased plan.

## Setup

```bash
cd clipdows
npm install
npx electron-rebuild        # REQUIRED — better-sqlite3 and nut-js are native modules
                             # and must be rebuilt against Electron's Node ABI
npm start
```

### Before first run
1. Drop a 16x16 (and 32x32 for retina) `tray-icon.png` into `assets/` — export it from the ClipDows cloud/clipboard mark you shared.
2. `Super+Shift+V` maps to `Win+Shift+V` on Windows (Electron calls the Windows key "Super"). If registration fails (logged to console), another app already owns that combo — pick a different one in `main.js`.
3. Auto-paste needs no extra permissions on Windows (unlike macOS Accessibility access), so it should work out of the box.

## Why these libraries
- **better-sqlite3**: synchronous, fast, no async ceremony for a local-only history store — perfect fit for Electron's main process.
- **@nut-tree-fork/nut-js**: actively maintained fork (the original `nut-js` and `robotjs` are both stale); ships prebuilt binaries for common Electron/Node versions, used here just to simulate `Ctrl+V`.

## Next steps to discuss
- Dashboard window (full item grid, pinned section, trash) — reuses `db.js` + a new `IPC` surface, minimal new backend work
- Snippets (title + content + folder) — table already scaffolded in `db.js`
- Settings persistence (theme, accent, autostart) — via `electron-store` (already in package.json)
- Sync — needs a decision on backend (Firebase vs custom) before any code
