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

  // Online Auto-Updater APIs
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: (payload) => ipcRenderer.invoke('updater:download', payload),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  cancelDownloadUpdate: () => ipcRenderer.send('updater:cancel'),
  openExternalUrl: (url) => ipcRenderer.send('updater:open-url', url),
  onUpdateProgress: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('updater:progress', handler);
    return () => ipcRenderer.removeListener('updater:progress', handler);
  }
};

try {
  contextBridge.exposeInMainWorld('electronAPI', api);
} catch (_) {}

if (typeof window !== 'undefined') {
  window.electronAPI = api;
}

