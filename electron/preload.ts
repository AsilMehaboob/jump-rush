import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('humanRunner', {
  readStore: (): Promise<unknown> => ipcRenderer.invoke('store:read'),
  writeStore: (data: unknown): Promise<boolean> => ipcRenderer.invoke('store:write', data),
  toggleFullscreen: (): Promise<boolean> => ipcRenderer.invoke('window:toggleFullscreen'),
  quit: (): Promise<void> => ipcRenderer.invoke('window:quit'),
});
