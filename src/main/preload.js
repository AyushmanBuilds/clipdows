const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clipdows', {
  getItems: (opts) => ipcRenderer.invoke('items:get', opts),
  pasteItem: (id) => ipcRenderer.invoke('items:paste', id),
  copyOnly: (id) => ipcRenderer.invoke('items:copyOnly', id),
  saveImage: (id) => ipcRenderer.invoke('items:saveImage', id),
  togglePin: (id) => ipcRenderer.invoke('items:togglePin', id),
  trashItem: (id) => ipcRenderer.invoke('items:trash', id),
  updateTags: (id, tags) => ipcRenderer.invoke('items:updateTags', { id, tags }),
  updateContent: (id, content) => ipcRenderer.invoke('items:updateContent', { id, content }),
  createSnippet: (title, content, folder, trigger) => ipcRenderer.invoke('snippets:create', { title, content, folder, trigger }),
  // Plans
  getPlan: () => ipcRenderer.invoke('plan:get'),
  setDevPlan: (tier) => ipcRenderer.invoke('plan:setDev', tier),
  setPaidPlan: (p) => ipcRenderer.invoke('plan:setPaid', p),
  setTrial: (endsAt) => ipcRenderer.invoke('plan:setTrial', endsAt),
  onPlanChanged: (cb) => ipcRenderer.on('plan:changed', (_evt, info) => cb(info)),

  // Microsoft Store MSIX updates. The Store bridge reports progress and owns package installation.
  isStorePackage: () => ipcRenderer.invoke('storeUpdate:isAvailable'),
  checkStoreUpdates: () => ipcRenderer.invoke('storeUpdate:check'),
  installStoreUpdate: () => ipcRenderer.invoke('storeUpdate:install'),
  onStoreUpdateState: (cb) => ipcRenderer.on('storeUpdate:state', (_evt, state) => cb(state)),

  // Per-account local database, multi-select actions, and settings bridge
  setSession: (uid) => ipcRenderer.invoke('session:set', uid),
  bulkItems: (action, ids) => ipcRenderer.invoke('items:bulk', { action, ids }),
  applySettings: (s) => ipcRenderer.send('settings:apply', s),
  getFocusCaptureState: () => ipcRenderer.invoke('focusCapture:getState'),
  setFocusCaptureEnabled: (enabled) => ipcRenderer.invoke('focusCapture:setEnabled', !!enabled),
  onFocusCaptureChanged: (cb) => ipcRenderer.on('focusCapture:changed', (_evt, state) => cb(state)),
  getDashboardWindowMode: () => ipcRenderer.invoke('window:getDashboardMode'),
  onDashboardWindowModeChanged: (cb) => ipcRenderer.on('window:dashboardModeChanged', (_evt, mode) => cb(mode)),
  getWallpaper: () => ipcRenderer.invoke('theme:getWallpaper'),
  chooseWallpaper: () => ipcRenderer.invoke('theme:chooseWallpaper'),
  clearWallpaper: () => ipcRenderer.invoke('theme:clearWallpaper'),
  onWallpaperChanged: (cb) => ipcRenderer.on('theme:wallpaperChanged', (_evt, dataUrl, fileName) => cb(dataUrl, fileName)),

  // User-configurable global show/hide shortcut (defaults to Alt)
  getGlobalShortcut: () => ipcRenderer.invoke('shortcut:get'),
  setGlobalShortcut: (accelerator) => ipcRenderer.invoke('shortcut:set', accelerator),

  hidePopup: () => ipcRenderer.send('popup:hide'),
  openDashboard: () => ipcRenderer.send('dashboard:open'),
  onItemsUpdated: (cb) => ipcRenderer.on('items:updated', () => cb()),
  onShown: (cb) => ipcRenderer.on('popup:shown', () => cb()),

  // Cloud / phone-pairing bridge (used by firestoreSync.js in the renderer)
  onCloudPush: (cb) => ipcRenderer.on('cloud:push', (_evt, item) => cb(item)),
  reportCloudItem: (item) => ipcRenderer.invoke('cloud:itemReceived', item),
  // Encryption key vault (Windows DPAPI via Electron safeStorage) + source-app icons
  vaultLoad: (uid) => ipcRenderer.invoke('vault:load', uid),
  vaultSave: (uid, keyB64) => ipcRenderer.invoke('vault:save', uid, keyB64),
  vaultClear: (uid) => ipcRenderer.invoke('vault:clear', uid),
  getAppIcon: (exePath) => ipcRenderer.invoke('apps:icon', exePath),
  reportDeviceLinked: (device) => ipcRenderer.invoke('cloud:deviceLinked', device),
  listFocusReview: () => ipcRenderer.invoke('focusReview:list'),
  exportFocusReviewSync: () => ipcRenderer.invoke('focusReview:exportSync'),
  mergeFocusReviewSync: (state) => ipcRenderer.invoke('focusReview:mergeSync', state),
  keepFocusReviewItem: (id) => ipcRenderer.invoke('focusReview:keep', id),
  deleteFocusReviewItem: (id) => ipcRenderer.invoke('focusReview:delete', id),
  onFocusReviewChanged: (cb) => ipcRenderer.on('focusReview:changed', () => cb()),
  onFocusReviewOpen: (cb) => ipcRenderer.on('focusReview:open', () => cb()),
  onDevicesUpdated: (cb) => ipcRenderer.on('devices:updated', (_evt, device) => cb(device)),
});
