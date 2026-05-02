const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ucmuDesktop', {
  minimize: () => ipcRenderer.invoke('ucmu:window:minimize'),
  maximize: () => ipcRenderer.invoke('ucmu:window:maximize'),
  close: () => ipcRenderer.invoke('ucmu:window:close')
});
