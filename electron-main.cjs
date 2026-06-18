const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const crashLogPath = path.join(os.tmpdir(), 'qdown-crash.log');

process.on('uncaughtException', (err) => {
  fs.appendFileSync(crashLogPath, 'UNCAUGHT EXCEPTION:\n' + (err.stack || err.toString()) + '\n');
  if (app.isReady()) dialog.showErrorBox('Fatal Error', err.stack || err.toString());
});
process.on('unhandledRejection', (reason) => {
  fs.appendFileSync(crashLogPath, 'UNHANDLED REJECTION:\n' + (reason instanceof Error ? reason.stack : String(reason)) + '\n');
  if (app.isReady()) dialog.showErrorBox('Fatal Error', reason instanceof Error ? reason.stack : String(reason));
});


// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  fs.appendFileSync(crashLogPath, 'Quitting because another instance holds the lock.\n');
  app.quit();
} else {
  // When bundled, we are in dist-server/electron-main.cjs
  // the static dist folder is one level up
  const staticDir = path.join(__dirname, '..', 'dist');

  let mainWindow;

  function createWindow() {
    mainWindow = new BrowserWindow({
      title: 'qDown',
      width: 1000,
      height: 700,
      minWidth: 800,
      minHeight: 600,
      frame: false, // frameless window
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.cjs') // load preload script
      },
      autoHideMenuBar: true,
    });

    // Show window immediately so user sees it opened
    mainWindow.show();

    // Start the local Express server
    try {
      require('./server.cjs');
    } catch (e) {
      console.error('Failed to start local server:', e);
      fs.appendFileSync(crashLogPath, 'SERVER REQUIRE FAILED:\n' + (e.stack || e.toString()) + '\n');
      dialog.showErrorBox('Server Crash', e.stack || e.toString());
    }

    // In production (bundled), load the index.html via the local express server
    // which runs on 127.0.0.1:3001 by default, or we can load the file directly.
    // Since yt-dlp requires the backend API on 3001, we will just point to localhost:3001.
    // In dev, we point to localhost:3000 (Vite).
    const isDev = !app.isPackaged;
    const startUrl = isDev ? 'http://127.0.0.1:3000' : 'http://127.0.0.1:3001';
    
    // Function to load URL with retries since Express server might take a moment to start
    const loadUrlWithRetry = (url, retries = 5) => {
      mainWindow.loadURL(url).catch((err) => {
        if (retries > 0) {
          console.log(`Failed to load ${url}, retrying in 500ms...`);
          setTimeout(() => loadUrlWithRetry(url, retries - 1), 500);
        } else {
          console.error(`Failed to load ${url} after retries.`);
        }
      });
    };

    // Wait a brief moment to give the local server time to start listening
    setTimeout(() => {
      loadUrlWithRetry(startUrl);
    }, 500);

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      fs.appendFileSync(crashLogPath, `[RENDERER FAIL LOAD] code: ${errorCode}, desc: ${errorDescription}, url: ${validatedURL}\n`);
    });

    mainWindow.webContents.on('render-process-gone', (event, details) => {
      fs.appendFileSync(crashLogPath, `[RENDERER PROCESS GONE] reason: ${details.reason}, exitCode: ${details.exitCode}\n`);
    });

    mainWindow.webContents.on('unresponsive', () => {
      fs.appendFileSync(crashLogPath, `[RENDERER UNRESPONSIVE]\n`);
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  // Register IPC handlers for custom titlebar & directory selector
  ipcMain.on('window-minimize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.minimize();
  });
  ipcMain.on('window-maximize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      if (win.isMaximized()) win.unmaximize();
      else win.maximize();
    }
  });
  ipcMain.on('window-close', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.close();
  });
  ipcMain.handle('select-directory', async (event, defaultPath) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      defaultPath: defaultPath || undefined
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  ipcMain.on('uninstall-app', (event) => {
    const execDir = path.dirname(process.execPath);
    const uninstallerPath = path.join(execDir, 'Uninstall qDown.exe');
    if (fs.existsSync(uninstallerPath)) {
      const { spawn } = require('child_process');
      spawn(uninstallerPath, [], {
        detached: true,
        stdio: 'ignore'
      }).unref();
      app.quit();
    } else {
      const win = BrowserWindow.fromWebContents(event.sender);
      dialog.showMessageBoxSync(win, {
        type: 'info',
        title: '삭제 안내',
        message: '설치판 환경이 아니거나 삭제 프로그램(Uninstall qDown.exe)을 찾을 수 없습니다. 제어판이나 설정 앱에서 qDown을 삭제해주세요.'
      });
    }
  });

  // Quit background server when electron quits
  app.on('quit', () => {
    process.exit(0);
  });
}
