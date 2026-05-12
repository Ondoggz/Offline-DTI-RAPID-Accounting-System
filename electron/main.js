const path = require("path");
const { pathToFileURL } = require("url");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const { app, BrowserWindow, ipcMain } = require("electron");
const jwt = require("jsonwebtoken");
const db = require("./db");
const { syncToRemote, checkOnline, getPendingCount } = require("./sync");

let dbReady = false;
let mainWindow = null;
let sessionToken = null;
let sessionUser = null;

/* =========================
   WAIT FOR VITE (DEV ONLY)
========================= */
function waitForVite(url, retries = 20, interval = 500) {
  return new Promise((resolve) => {
    const http = require("http");
    function attempt(remaining) {
      const req = http.get(url, (res) => {
        if (res.statusCode < 500) resolve();
        else if (remaining > 0) setTimeout(() => attempt(remaining - 1), interval);
        else resolve();
      });
      req.on("error", () => {
        if (remaining > 0) setTimeout(() => attempt(remaining - 1), interval);
        else resolve();
      });
      req.end();
    }
    attempt(retries);
  });
}

/* =========================
   CREATE WINDOW
========================= */
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  const isDev = !app.isPackaged;
  const devURL = "http://localhost:5173";

  const prodPath = path.join(process.resourcesPath, "client/dist/index.html");
  const prodURL = pathToFileURL(prodPath).toString();

  console.log("APP MODE:", isDev ? "DEV" : "PROD");

  if (isDev) {
    await waitForVite(devURL);
    mainWindow.loadURL(devURL);
  } else {
    mainWindow.loadURL(prodURL);
  }

  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

/* =========================
   DB SAFETY
========================= */
function ensureDB() {
  if (!dbReady) throw new Error("Database not ready");
}

/* =========================
   IPC — AUTH
========================= */
ipcMain.handle("user:login", (_, { username, password }) => {
  ensureDB();
  const users = db.getUserByUsername(username);
  const user = users[0];

  if (!user) return { success: false, message: "User not found" };
  if (user.password !== password) return { success: false, message: "Incorrect password" };

  const safeUser = { ...user };
  delete safeUser.password;

  const token = jwt.sign(safeUser, process.env.JWT_SECRET, { expiresIn: "1d" });

  sessionToken = token;
  sessionUser = safeUser;

  return { success: true, user: safeUser, token };
});

ipcMain.handle("user:session", () => {
  return sessionToken ? { token: sessionToken, user: sessionUser } : null;
});

ipcMain.handle("user:logout", () => {
  sessionToken = null;
  sessionUser = null;
  return { success: true };
});

/* =========================
   IPC — USERS
========================= */
ipcMain.handle("user:get", () => {
  ensureDB();
  return db.getUsers();
});

ipcMain.handle("user:add", (_, userData) => {
  ensureDB();
  return db.addUser(userData);
});

ipcMain.handle("user:find", (_, username) => {
  ensureDB();
  return db.getUserByUsername(username);
});

ipcMain.handle("user:delete", (_, id) => {
  ensureDB();
  return db.deleteUser(id);
});

/* =========================
   IPC — BEANS
========================= */
ipcMain.handle("bean:get", () => {
  ensureDB();
  return db.getBeans();
});

ipcMain.handle("bean:add", (_, beanData) => {
  ensureDB();
  return db.addBean(beanData);
});

ipcMain.handle("bean:delete", (_, id) => {
  ensureDB();
  return db.deleteBean(id);
});

/* =========================
   IPC — FARMERS
========================= */
ipcMain.handle("farmer:get", () => {
  ensureDB();
  return db.getFarmers();
});

ipcMain.handle("farmer:add", (_, farmerData) => {
  ensureDB();
  return db.addFarmer(farmerData);
});

ipcMain.handle("farmer:update", (_, { id, data }) => {
  ensureDB();
  return db.updateFarmer(id, data);
});

ipcMain.handle("farmer:delete", (_, id) => {
  ensureDB();
  return db.deleteFarmer(id);
});

/* =========================
   IPC — DELIVERIES
========================= */
ipcMain.handle("delivery:get", () => {
  ensureDB();
  return db.getDeliveries();
});

ipcMain.handle("delivery:add", (_, deliveryData) => {
  ensureDB();
  return db.addDelivery(deliveryData);
});

ipcMain.handle("delivery:delete", (_, { id, password }) => {
  ensureDB();
  return db.deleteDelivery(id, password);
});

/* =========================
   IPC — PAYMENTS
========================= */
ipcMain.handle("payment:get", () => {
  ensureDB();
  return db.getPayments();
});

ipcMain.handle("payment:add", (_, paymentData) => {
  ensureDB();
  return db.addPayment(paymentData);
});

/* =========================
   IPC — TRANSACTIONS
========================= */
ipcMain.handle("transaction:get", () => {
  ensureDB();
  return db.getTransactions();
});

/* =========================
   PRINT
========================= */
ipcMain.handle("form:print", (_, data) => {
  console.log("[PRINT]", data);
  return { success: true };
});

/* =========================
   SYNC
========================= */
ipcMain.handle("sync:trigger", async () => {
  ensureDB();
  return await syncToRemote(db, (msg) => {
    mainWindow?.webContents.send("sync:progress", msg);
  });
});

ipcMain.handle("sync:checkOnline", async () => {
  return await checkOnline();
});

ipcMain.handle("sync:pending", () => {
  ensureDB();
  return getPendingCount(db);
});

/* =========================
   APP INIT
========================= */
app.whenReady().then(async () => {
  await createWindow();
  await db.initDB();
  dbReady = true;
});