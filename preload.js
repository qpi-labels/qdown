const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  selectDirectory: (defaultPath) => ipcRenderer.invoke('select-directory', defaultPath),
  uninstall: () => ipcRenderer.send('uninstall-app'),
  isElectron: true
});
