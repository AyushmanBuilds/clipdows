# Microsoft Store MSIX build

`npm run dist:msix` creates an unsigned, x64 MSIX for local package checks. It uses a development package identity (`ClipDows.Local` / `CN=ClipDows Local`) and cannot be submitted to the Store.

For a Store identity, reserve ClipDows in Partner Center, then copy the exact package identity name and publisher distinguished name from **Product management → Product identity**. In PowerShell, set:

```powershell
$env:MSIX_IDENTITY_NAME = 'the exact Package/Identity/Name from Partner Center'
$env:MSIX_PUBLISHER = 'the exact Package/Identity/Publisher from Partner Center'
$env:MSIX_PUBLISHER_DISPLAY_NAME = 'the publisher display name'
npm run dist:msix:store
```

The Store build writes `release/ClipDows-<version>-x64-store.msix`. The Store signs packages after certification, so this build does not include a developer certificate. Run the Windows App Certification Kit and install the package on a clean Windows profile before submitting it.

The MSIX uses the same Electron directory build as the existing NSIS installer and carries the app's unpacked native modules and bundled OCR data. It declares `runFullTrust` for the clipboard, global hotkey, keyboard-hook, and simulated-paste features. The current package identity is x64-only.

The Advanced settings page includes an in-app Store update flow. `npm run dist:msix` compiles the small Windows Store API bridge and packages it with the app. The Store checks for the current package's published update, downloads it while the app remains open, and reports progress to the in-app bar. After download, the user chooses **Restart to install**; the Store may show its own confirmation UI and Windows may close/relaunch the app during installation.

## Feature checks before Store release

- Store installations should update through the Store; the app already skips `electron-updater` when Electron reports a Store installation.
- The existing **Start on Windows startup** setting calls Electron's `app.setLoginItemSettings`. Electron documents that the registry entry written in a Windows Store package is inaccessible to other apps, and this setting needs a Windows `StartupTask` integration to work reliably under MSIX. Confirm and implement that integration before claiming the startup toggle works in the Store build.
- Test clipboard capture, tray behavior, global shortcuts, snippet triggers, OCR, auto-paste, data migration, and update behavior on an installed MSIX. Packaging alone cannot confirm runtime behavior of native keyboard hooks under Store certification.
