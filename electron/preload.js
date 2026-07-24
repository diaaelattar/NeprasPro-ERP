const { contextBridge, ipcRenderer } = require('electron');

// Expose protected APIs to the renderer process (React frontend)
contextBridge.exposeInMainWorld('electronAPI', {
  // We can add IPC methods here later if needed (e.g. file dialogs, system shell)
  ping: () => ipcRenderer.invoke('ping'),
});
