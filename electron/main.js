const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = process.argv.includes('--dev');

function firstExistingPath(paths) {
  return paths.find((candidatePath) => fs.existsSync(candidatePath));
}

function getAppIndexPath() {
  return firstExistingPath([
    path.join(__dirname, '..', 'app', 'index.html'),
    path.join(app.getAppPath(), 'app', 'index.html'),
    path.join(process.cwd(), 'app', 'index.html')
  ]);
}

function getPreloadPath() {
  return firstExistingPath([
    path.join(__dirname, 'preload.js'),
    path.join(app.getAppPath(), 'electron', 'preload.js'),
    path.join(process.cwd(), 'electron', 'preload.js')
  ]) || path.join(__dirname, 'preload.js');
}

async function loadUcmuApp(win) {
  const indexPath = getAppIndexPath();

  if (!indexPath) {
    console.error('[UCMU] app/index.html not found');
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
      <body style="margin:0;background:#020303;color:#fff;font-family:Consolas,monospace;display:grid;place-items:center;height:100vh">
        <div>U.C.M.U APP ERROR<br><br>app/index.html not found</div>
      </body>
    `)}`);
    return;
  }

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
    resizable: true,
    movable: true,
    show: false,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  Menu.setApplicationMenu(null);

  win.webContents.on('did-finish-load', () => {
    win.show();
    if (isDev) win.webContents.openDevTools({ mode: 'detach' });
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[UCMU] did-fail-load:', errorCode, errorDescription);
    win.show();
  });

  loadUcmuApp(win).catch((error) => {
    console.error('[UCMU] loadUcmuApp failed:', error);
    win.show();
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
