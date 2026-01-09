const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

const preloadPath = path.resolve(__dirname, 'preload.js');

let win;

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  //Menu.setApplicationMenu(null);

  const printurl = 'https://ecw.excelindia.com/svkmprinttest/PrintDashboard';
  win.loadURL(printurl);
  // win.webContents.openDevTools();
}


app.whenReady().then(() => {
  createWindow();

  // Check for updates on app start
  autoUpdater.checkForUpdates();
});

autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
});

autoUpdater.on('update-available', () => {
dialog.showMessageBox(win || undefined, {
    type: 'info',
    title: 'Update Available',
    message: 'A new version is downloading in background.'
  });
});

autoUpdater.on('update-not-available', () => {
  console.log('No updates available');
});

autoUpdater.on('error', (err) => {
  console.error('Auto update error:', err);
});

autoUpdater.on('update-downloaded', () => {
  dialog
    .showMessageBox(win, {
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded. Restart to apply?',
      buttons: ['Restart', 'Later']
    })
    .then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
});


ipcMain.on('print', (event, { printerName }) => {
  if (!win) return;

  win.webContents.print(
    {
      silent: true,
      printBackground: true,
      deviceName: printerName
    },
    (success, errorType) => {
      if (success) {
      dialog.showMessageBox(win || undefined, {
          type: 'info',
          title: 'Print',
          message: 'Simple Print Completed!',
          buttons: ['OK']
        });
      } else {
        dialog.showMessageBox(win || undefined, {
          type: 'error',
          title: 'Print Failed',
          message: `Print failed: ${errorType}`,
          buttons: ['OK']
        });
      }
    }
  );
});

ipcMain.on('print-html-content', (event, htmlString, printerName) => {
  const printWin = new BrowserWindow({ show: false });

  printWin.loadURL(
    'data:text/html;charset=utf-8,' + encodeURIComponent(htmlString)
  );

  printWin.webContents.on('did-finish-load', () => {
    printWin.webContents.print({
      silent: false,
      printBackground: false,
      deviceName: printerName
    });
  });
});

ipcMain.on('print-bytes', (event, bytes, printerName) => {
  const buffer = Buffer.from(bytes);
  const tempPath = path.join(app.getPath('temp'), 'print.html');

  fs.writeFileSync(tempPath, buffer);

  const printWin = new BrowserWindow({ show: false });
  printWin.loadFile(tempPath);

  printWin.webContents.on('did-finish-load', () => {
    printWin.webContents.print({
      silent: true,
      printBackground: true,
      deviceName: printerName
    });
  });
});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
