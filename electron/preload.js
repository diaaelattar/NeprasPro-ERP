const { contextBridge, ipcRenderer } = require('electron');

const api = {
  ping: () => ipcRenderer.invoke('ping'),
  openEmisPortal: (target) => ipcRenderer.send('emis:open-portal', target),
  openExportFolder: () => ipcRenderer.send('emis:open-folder'),
  sendEmisSyncData: (payload) => ipcRenderer.send('emis:sync-data', payload),
  syncEmisPromise: (payload) => ipcRenderer.invoke('emis:sync-data-promise', payload),
  getRegisteredCodes: () => ipcRenderer.invoke('emis:get-registered-codes'),
  emisSync: (students) => ipcRenderer.send('emis:sync-data', { students, source: 'extension' }),
  clearEmisSession: () => ipcRenderer.send('emis:clear-session'),
};

try {
  contextBridge.exposeInMainWorld('electronAPI', api);
} catch (_) {}

if (typeof window !== 'undefined') {
  window.electronAPI = api;
}
