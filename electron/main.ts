import { app, BrowserWindow, ipcMain, protocol, net, session } from 'electron';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const DEV_URL = process.env.VITE_DEV_SERVER_URL;
const distDir = join(__dirname, '..', 'dist');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } },
]);

let win: BrowserWindow | null = null;

function storeFile(): string {
  const dir = app.getPath('userData');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, 'scores.json');
}

function createWindow(): void {
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    backgroundColor: '#05050f',
    fullscreen: !DEV_URL,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      autoplayPolicy: 'no-user-gesture-required',
      nodeIntegration: false,
    },
  });
  win.setMenuBarVisibility(false);
  if (DEV_URL) void win.loadURL(DEV_URL);
  else void win.loadURL('app://local/index.html');
}

app.whenReady().then(() => {
  protocol.handle('app', (req) => {
    const url = new URL(req.url);
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    const file = join(distDir, rel);
    if (!file.startsWith(distDir)) return new Response('Forbidden', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });

  // Webcam only; everything else denied. No network access is needed.
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => cb(permission === 'media'));
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => permission === 'media');

  ipcMain.handle('store:read', () => {
    try { return JSON.parse(readFileSync(storeFile(), 'utf8')); } catch { return null; }
  });
  ipcMain.handle('store:write', (_e, data: unknown) => {
    try { writeFileSync(storeFile(), JSON.stringify(data)); return true; } catch { return false; }
  });
  ipcMain.handle('window:toggleFullscreen', () => {
    if (win) win.setFullScreen(!win.isFullScreen());
    return win?.isFullScreen() ?? false;
  });
  ipcMain.handle('window:quit', () => app.quit());

  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

app.on('window-all-closed', () => app.quit());
