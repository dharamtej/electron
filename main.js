const { app, BrowserWindow, ipcMain, Menu, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");

const preloadPath = path.resolve(__dirname, "preload.js");
let win;

/* =====================================================
   AUTO UPDATER CONFIG
===================================================== */
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = "info";

/* FORCE BINARY CHANGE (IMPORTANT FOR UPDATE DETECTION) */
console.log("Build timestamp:", new Date().toISOString());

function createMenuTemplate() {
  return [
    {
      label: "File",
      submenu: [
        {
          label: "Exit",
          accelerator: "Alt+F4",
          click: () => app.quit(),
        },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Check for Updates",
          click: () => {
            autoUpdater.checkForUpdatesAndNotify();
          },
        },
        {
          label: "About",
          click: showAboutDialog,
        },
      ],
    },
  ];
}

function showAboutDialog() {
  const packageJson = require("./package.json");
  dialog.showMessageBox(win, {
    type: "info",
    title: "About",
    message: `${packageJson.productName || packageJson.name}`,
    detail: `Version: ${packageJson.version}\nAuthor: ${packageJson.author}\nDescription: ${packageJson.description}`,
    buttons: ["OK"],
  });
}

/* =====================================================
   WINDOW
===================================================== */
function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const menu = Menu.buildFromTemplate(createMenuTemplate());
  Menu.setApplicationMenu(menu);

  const printurl = "https://ecw.excelindia.com/svkmprinttest/PrintDashboard";
  win.loadURL(printurl);
}

/* =====================================================
   APP READY
===================================================== */
app.whenReady().then(() => {
  createWindow();

  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 3000);
});

/* =====================================================
   AUTO UPDATER EVENTS
===================================================== */
autoUpdater.on("checking-for-update", () => {
  log.info("Checking for update...");
});

autoUpdater.on("update-available", (info) => {
  log.info("Update available:", info.version);
  dialog.showMessageBox(win, {
    type: "info",
    title: "Update Available",
    message: `New version ${info.version} is downloading in background.`,
  });
});

autoUpdater.on("update-not-available", () => {
  log.info("No updates available");
});

autoUpdater.on("download-progress", (progressObj) => {
  log.info(
    `Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`
  );
});

autoUpdater.on("error", (err) => {
  log.error("Auto update error:", err);
  dialog.showMessageBox(win, {
    type: "error",
    title: "Update Error",
    message: err.message,
  });
});

autoUpdater.on("update-downloaded", () => {
  dialog
    .showMessageBox(win, {
      type: "info",
      title: "Update Ready",
      message: "Update downloaded. Restart to apply?",
      buttons: ["Restart", "Later"],
    })
    .then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall(true, true);
      }
    });
});

/* RELEASE FILE LOCK (CRITICAL FIX) */
autoUpdater.on("before-quit-for-update", () => {
  if (win) {
    win.destroy();
  }
});

/* =====================================================
   PRINT LOGIC (UNCHANGED – YOUR ORIGINAL CODE)
===================================================== */
ipcMain.on("print", (event, { printerName }) => {
  if (!win) return;

  win.webContents.print(
    {
      silent: true,
      printBackground: true,
      deviceName: printerName,
    },
    (success, errorType) => {
      if (success) {
        dialog.showMessageBox(win, {
          type: "info",
          title: "Print",
          message: "Simple Print Completed!",
        });
      } else {
        dialog.showMessageBox(win, {
          type: "error",
          title: "Print Failed",
          message: `Print failed: ${errorType}`,
        });
      }
    }
  );
});

ipcMain.on("print-html-content", (event, htmlString, printerName) => {
  const printWin = new BrowserWindow({ show: false });

  printWin.loadURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(htmlString)
  );

  printWin.webContents.on("did-finish-load", () => {
    printWin.webContents.print({
      silent: false,
      printBackground: false,
      deviceName: printerName,
    });
  });
});

ipcMain.on("print-bytes", (event, bytes, printerName) => {
  const buffer = Buffer.from(bytes);
  const tempPath = path.join(app.getPath("temp"), "print.html");

  fs.writeFileSync(tempPath, buffer);

  const printWin = new BrowserWindow({ show: false });
  printWin.loadFile(tempPath);

  printWin.webContents.on("did-finish-load", () => {
    printWin.webContents.print({
      silent: true,
      printBackground: true,
      deviceName: printerName,
    });
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
