const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;

function firstExistingPath(paths) {
  return paths.find((p) => fs.existsSync(p));
}

function getCleanIndexPath() {
  return firstExistingPath([
    path.join(__dirname, '..', 'clean', 'index.html'),
    path.join(app.getAppPath(), 'clean', 'index.html'),
    path.join(process.cwd(), 'clean', 'index.html')
  ]);
}

function getPreloadPath() {
  return firstExistingPath([
    path.join(__dirname, 'preload.js'),
    path.join(app.getAppPath(), 'electron', 'preload.js'),
    path.join(process.cwd(), 'electron', 'preload.js')
  ]) || path.join(__dirname, 'preload.js');
}

async function loadCleanApp(win) {
  const indexPath = getCleanIndexPath();

  if (!indexPath) {
    console.error('[UCMU] clean/index.html not found');
    console.error('[UCMU] __dirname:', __dirname);
    console.error('[UCMU] appPath:', app.getAppPath());
    console.error('[UCMU] cwd:', process.cwd());
    return;
  }

  console.log('[UCMU] Loading clean UI:', indexPath);
  await win.loadFile(indexPath);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: '#020303',
    frame: false,
    titleBarStyle: 'hidden',
    show: false,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  Menu.setApplicationMenu(null);

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('[UCMU] did-fail-load:', errorCode, errorDescription, validatedURL);
  });

  loadCleanApp(win).catch((error) => {
    console.error('[UCMU] loadCleanApp failed:', error);
  });

  win.once('ready-to-show', () => {
    win.show();
    if (isDev) win.webContents.openDevTools({ mode: 'detach' });
  });

  ipcMain.handle('ucmu:window:minimize', () => win.minimize());
  ipcMain.handle('ucmu:window:maximize', () => {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  ipcMain.handle('ucmu:window:close', () => win.close());
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
