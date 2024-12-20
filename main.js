require("dotenv").config();
const url = require("url");
const path = require("path");
const { app, BrowserWindow, Menu, Tray, nativeImage, dialog, ipcMain } = require("electron");

global.windowApp = null;
let iconPath = path.join(__dirname, "assets", "images", "icon.jpg");
let icon = nativeImage.createFromPath(iconPath);

const createWindow = () => {
  global.windowApp = new BrowserWindow({
    width: 850,
    height: 600,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: false,
      enableRemoteModule: false,
      devTools: false
    },
    center: true,
    fullscreenable: false,
    resizable: false,
    maximizable: false,
    devTools: false,
    icon: path.join(__dirname, "assets/images/logo.jpg"),
  });

  

  global.windowApp.loadURL(
    url.format({
      pathname: path.join(__dirname, "pages", "index.html"),
      protocol: "file:",
      slashes: true,
    })
  );

  Menu.setApplicationMenu(null);
  let tray = new Tray(icon.resize({ width: 24, height: 24 }));
  let trayMenu = Menu.buildFromTemplate([
    {
      label: "Show",
      click: () => {
        global.windowApp.show();
      },
    },
    {
      label: "Exit Application",
      click: () => {
        app.isQuit = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(trayMenu);

  global.windowApp.on("minimize", (event) => {
    event.preventDefault();
    global.windowApp.hide();
  });
  global.windowApp.on("close", () => (global.windowApp = null));
};

app.on("ready", createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("show-alert", async (event, title, message) => {
  dialog.showMessageBox(mainWindow, {
    type: "info",
    buttons: ["OK"],
    title: title || "Alert",
    message: message || "Something happened!",
  });
});
