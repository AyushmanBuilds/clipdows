const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clipdows', {
  getItems: (opts) => ipcRenderer.invoke('items:get', opts),
  pasteItem: (id) => ipcRenderer.invoke('items:paste', id),
  copyOnly: (id) => ipcRenderer.invoke('items:copyOnly', id),
  togglePin: (id) => ipcRenderer.invoke('items:togglePin', id),
  trashItem: (id) => ipcRenderer.invoke('items:trash', id),
  hidePopup: () => ipcRenderer.send('popup:hide'),
  openDashboard: () => ipcRenderer.send('dashboard:open'),
  onItemsUpdated: (cb) => ipcRenderer.on('items:updated', () => cb()),
  onShown: (cb) => ipcRenderer.on('popup:shown', () => cb()),
});