"use strict";

const path = require("node:path");
const { app, BrowserWindow, shell } = require("electron");
const { createNomosServer } = require("../backend/server");

let backend;
let mainWindow;
const hasSingleInstanceLock = app.requestSingleInstanceLock();
const useRendererV2 = !process.argv.includes("--renderer-legacy") && process.env.NOMOS_RENDERER !== "legacy";

if (!hasSingleInstanceLock) app.quit();

async function createWindow() {
  if (useRendererV2) {
    const { createNomosServerV1 } = require("../dist-ts/server");
    backend = createNomosServerV1({
      dataDir: path.join(app.getPath("userData"), "data-v1"),
      rendererDir: path.join(__dirname, "..", "renderer-v2"),
    });
  } else {
    backend = createNomosServer({
      dataDir: path.join(app.getPath("userData"), "data"),
    });
  }
  const address = await backend.start();

  mainWindow = new BrowserWindow({
    width: 1480,
    height: 980,
    minWidth: 1120,
    minHeight: 760,
    title: useRendererV2 ? "Nomos V0.0.3" : "nomos",
    icon: path.join(__dirname, "..", "build", "icon.png"),
    backgroundColor: "#f4f2ed",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(address.url)) event.preventDefault();
  });

  await mainWindow.loadURL(address.url);
}

if (hasSingleInstanceLock) {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    await createWindow();
    app.on("activate", async () => {
      if (BrowserWindow.getAllWindows().length === 0) await createWindow();
    });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", async (event) => {
  if (!backend) return;
  event.preventDefault();
  const currentBackend = backend;
  backend = null;
  await currentBackend.stop();
  app.quit();
});
