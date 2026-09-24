const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clipdows', {
  getItems: (opts) => ipcRenderer.invoke('items:get', opts),
  pasteItem: (id) => ipcRenderer.invoke('items:paste', id),
  copyOnly: (id) => ipcRenderer.invoke('items:copyOnly', id),
  togglePin: (id) => ipcRenderer.invoke('items:togglePin', id),
  trashItem: (id) => ipcRenderer.invoke('items:trash', id),
  updateTags: (id, tags) => ipcRenderer.invoke('items:updateTags', { id, tags }),
  updateContent: (id, content) => ipcRenderer.invoke('items:updateContent', { id, content }),
  createSnippet: (title, content, folder) => ipcRenderer.invoke('snippets:create', { title, content, folder }),

  // Per-account local database, multi-select actions, and settings bridge
  setSession: (uid) => ipcRenderer.invoke('session:set', uid),
  bulkItems: (action, ids) => ipcRenderer.invoke('items:bulk', { action, ids }),
  applySettings: (s) => ipcRenderer.send('settings:apply', s),

  googleSignIn: () => ipcRenderer.invoke('auth:google'),
  googleCancel: () => ipcRenderer.send('auth:googleCancel'),
  hidePopup: () => ipcRenderer.send('popup:hide'),
  openDashboard: () => ipcRenderer.send('dashboard:open'),
  onItemsUpdated: (cb) => ipcRenderer.on('items:updated', () => cb()),
  onShown: (cb) => ipcRenderer.on('popup:shown', () => cb()),

  // Cloud / phone-pairing bridge (used by firestoreSync.js in the renderer)
  onCloudPush: (cb) => ipcRenderer.on('cloud:push', (_evt, item) => cb(item)),
  reportCloudItem: (item) => ipcRenderer.invoke('cloud:itemReceived', item),
  reportDeviceLinked: (device) => ipcRenderer.invoke('cloud:deviceLinked', device),
  onDevicesUpdated: (cb) => ipcRenderer.on('devices:updated', (_evt, device) => cb(device)),
});