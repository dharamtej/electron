const { app, BrowserWindow, ipcMain, Menu, dialog } = require("electron");
const path = require("path");
const { pathToFileURL } = require("url");
const fs = require("fs");
const { autoUpdater } = require("electron-updater");

const preloadPath = path.resolve(__dirname, "preload.js");

let win;

// Configure auto-updater
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.logger = require("electron-log");
autoUpdater.logger.transports.file.level = "info";

// Create menu template
function createMenuTemplate() {
  return [
    {
      label: "File",
      submenu: [
        {
          label: "Exit",
          accelerator: "Alt+F4",
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Check for Updates",
          click: () => {
            checkForUpdatesManually();
          },
        },
        {
          label: "About",
          click: () => {
            showAboutDialog();
          },
        },
      ],
    },
  ];
}

// Manual update check function
function checkForUpdatesManually() {
  dialog.showMessageBox(win, {
    type: "info",
    title: "Checking for Updates",
    message: "Checking for updates...",
    buttons: ["OK"],
  });

  autoUpdater.checkForUpdates();
}

// Show about dialog
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

  // Set the application menu
  const menu = Menu.buildFromTemplate(createMenuTemplate());
  Menu.setApplicationMenu(menu);

  const printurl = "https://ecw.excelindia.com/svkmprinttest/PrintDashboard";
  win.loadURL(printurl);
  // win.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  // Delay update check to ensure window is ready
  setTimeout(() => {
    autoUpdater.checkForUpdates();
  }, 3000);
});

autoUpdater.on("checking-for-update", () => {
  console.log("Checking for update...");
});

autoUpdater.on("update-available", (info) => {
  console.log("Update available:", info.version);
  dialog.showMessageBox(win || undefined, {
    type: "info",
    title: "Update Available",
    message: `New version ${info.version} is downloading in background.`,
  });
});

autoUpdater.on("update-not-available", () => {
  console.log("No updates available");
  // Show message only when manually checking for updates
  if (win && win.isFocused()) {
    dialog.showMessageBox(win, {
      type: "info",
      title: "No Updates",
      message: "You are already using the latest version.",
      buttons: ["OK"],
    });
  }
});

autoUpdater.on("download-progress", (progressObj) => {
  let log_message = "Download speed: " + progressObj.bytesPerSecond;
  log_message = log_message + " - Downloaded " + progressObj.percent + "%";
  log_message =
    log_message +
    " (" +
    progressObj.transferred +
    "/" +
    progressObj.total +
    ")";
  console.log(log_message);
});

autoUpdater.on("error", (err) => {
  console.error("Auto update error:", err);
  dialog.showMessageBox(win || undefined, {
    type: "error",
    title: "Update Error",
    message: `Error: ${err.message}. Please check your internet connection and try again.`,
    buttons: ["OK"],
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
        autoUpdater.quitAndInstall();
      }
    });
});

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
        dialog.showMessageBox(win || undefined, {
          type: "info",
          title: "Print",
          message: "Simple Print Completed!",
          buttons: ["OK"],
        });
      } else {
        dialog.showMessageBox(win || undefined, {
          type: "error",
          title: "Print Failed",
          message: `Print failed: ${errorType}`,
          buttons: ["OK"],
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
