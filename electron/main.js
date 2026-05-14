const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const { app, BrowserWindow, ipcMain } = require("electron");
const fs = require("fs");
const crypto = require("crypto");
const db = require("./db");
const { syncToRemote, checkOnline, getPendingCount } = require("./sync");

let dbReady = false;
let mainWindow = null;
let syncInterval = null;
let sessionUser = null;

/* =========================
   WAIT FOR VITE
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
  const prodURL = `file://${path.join(
    process.resourcesPath,
    "client/dist/index.html"
  )}`;

  console.log("APP MODE:", isDev ? "DEV" : "PROD");

  if (isDev) {
    await waitForVite(devURL);
    console.log("LOADING:", devURL);
    mainWindow.loadURL(devURL);
  } else {
    console.log("LOADING:", prodURL);
    mainWindow.loadURL(prodURL);
  }

  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.on("did-fail-load", (_, code, desc) => {
    console.error("❌ LOAD FAILED:", code, desc);
    mainWindow.show();
  });

  mainWindow.webContents.on("render-process-gone", (_, details) => {
    console.error("❌ RENDER CRASHED:", details);
  });
}

/* =========================
   HELPERS
========================= */
function ensureDB() {
  if (!dbReady) throw new Error("Database not ready");
}

function emitUpdate(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function emitAllDataUpdated() {
  emitUpdate("farmers:updated");
  emitUpdate("deliveries:updated");
  emitUpdate("payments:updated");
  emitUpdate("beans:updated");
  emitUpdate("transactions:updated");
}

/* =========================
   SYNC RUNNER
========================= */
const SYNC_INTERVAL_MS = 10_000;

async function runSync() {
  if (!dbReady) {
    return {
      success: false,
      pushed: 0,
      pulled: 0,
      failed: 0,
      errors: ["Database not ready"],
    };
  }

  emitUpdate("sync:status", { syncing: true, online: true });

  const result = await syncToRemote(db, (msg) => {
    console.log("[SYNC PROGRESS]", msg);
    emitUpdate("sync:progress", msg);
  });

  console.log("[SYNC RESULT]", result);

  const pending = getPendingCount(db);

  emitUpdate("sync:status", {
    syncing: false,
    online: result.success || result.errors?.[0] !== "Device is offline",
    pending,
    lastSync: result.success ? new Date().toISOString() : null,
    errors: result.errors || [],
    pushed: result.pushed || 0,
    pulled: result.pulled || 0,
  });

  if ((result.pushed || 0) > 0 || (result.pulled || 0) > 0) {
    emitAllDataUpdated();
  }

  return result;
}

/* =========================
   APP INIT
========================= */
app.whenReady().then(async () => {
  await createWindow();

  try {
    console.log("INIT DB...");
    await db.initDB();
    dbReady = true;
    console.log("DB READY");
  } catch (err) {
    console.error("DB FAILED:", err);
    return;
  }

  runSync();
  syncInterval = setInterval(runSync, SYNC_INTERVAL_MS);
});

app.on("window-all-closed", () => {
  if (syncInterval) clearInterval(syncInterval);
  app.quit();
});

/* =========================
   IPC — SYNC
========================= */
ipcMain.handle("sync:trigger", async () => {
  ensureDB();
  console.log("[IPC] sync:trigger called");
  return await runSync();
});

ipcMain.handle("sync:checkOnline", async () => {
  return await checkOnline();
});

ipcMain.handle("sync:pending", () => {
  ensureDB();
  return getPendingCount(db);
});

/* =========================
   IPC — AUTH
========================= */
ipcMain.handle("user:login", (_, { username, password }) => {
  ensureDB();

  const users = db.getUserByUsername(username);
  const user = users[0];

  if (!user) return { success: false, message: "User not found" };

  if (user.password !== password) {
    return { success: false, message: "Incorrect password" };
  }

  const safeUser = { ...user };
  delete safeUser.password;

  sessionUser = safeUser;

  return { success: true, user: safeUser };
});

ipcMain.handle("user:session", () => {
  return sessionUser ? { user: sessionUser } : null;
});

ipcMain.handle("user:logout", () => {
  sessionUser = null;
  return { success: true };
});

/* =========================
   IPC — USERS
========================= */
ipcMain.handle("user:add", (_, data) => {
  ensureDB();

if (!data.name?.trim() || !data.username?.trim()) {
  return { success: false, message: "Missing required fields" };
}

  if (!data.sex) {
    return { success: false, message: "Sex is required" };
  }

  if (!data.position) {
    return { success: false, message: "Position is required" };
  }

  if (data.password.length < 8) {
    return { success: false, message: "Password too short" };
  }

  const hasLetter = /[A-Za-z]/.test(data.password);
  const hasNumber = /\d/.test(data.password);

  if (!hasLetter || !hasNumber) {
    return { success: false, message: "Password must include letters and numbers" };
  }

  if (!data.age || Number(data.age) <= 0) {
  return { success: false, message: "Invalid age" };
}

  if (!data.role) {
    return { success: false, message: "Role is required" };
  }

  const res = db.addUser(data);
  emitUpdate("users:updated");

  return { success: true, result: res };
});

ipcMain.handle("user:get", () => {
  ensureDB();
  return db.getUsers();
});

ipcMain.handle("user:find", (_, username) => {
  ensureDB();
  return db.getUserByUsername(username);
});

ipcMain.handle("user:delete", (_, id) => {
  ensureDB();
  const res = db.deleteUser(id);
  emitUpdate("users:updated");
  return res;
});

/* =========================
   IPC — BEANS
========================= */
ipcMain.handle("bean:add", (_, data) => {
  ensureDB();
  const res = db.addBean(data);
  emitUpdate("beans:updated");
  return res;
});

ipcMain.handle("bean:get", () => {
  ensureDB();
  return db.getBeans();
});

ipcMain.handle("bean:delete", (_, id) => {
  ensureDB();
  const res = db.deleteBean(id);
  emitUpdate("beans:updated");
  return res;
});

/* =========================
   IPC — FARMERS
========================= */
ipcMain.handle("farmer:add", (_, data) => {
  ensureDB();
  const res = db.addFarmer(data);
  emitUpdate("farmers:updated");
  return res;
});

ipcMain.handle("farmer:get", () => {
  ensureDB();
  return db.getFarmers();
});

ipcMain.handle("farmer:update", (_, { id, data }) => {
  ensureDB();
  const res = db.updateFarmer(id, data);
  emitUpdate("farmers:updated");
  return res;
});

ipcMain.handle("farmer:delete", (_, id) => {
  ensureDB();
  const res = db.deleteFarmer(id);
  emitUpdate("farmers:updated");
  return res;
});

/* =========================
   IPC — DELIVERIES
========================= */
ipcMain.handle("delivery:add", (_, data) => {
  ensureDB();
  const res = db.addDelivery(data);
  emitUpdate("deliveries:updated");
  emitUpdate("transactions:updated");
  return res;
});

ipcMain.handle("delivery:get", () => {
  ensureDB();
  return db.getDeliveries();
});

ipcMain.handle("delivery:delete", (_, payload) => {
  ensureDB();

  const { id, password } = payload || {};
  if (!id) return { success: false, message: "Missing ID" };

  const ADMIN_PASSWORD = process.env.ADMIN_DELETE_PASSWORD || "admin123";

  if (password !== ADMIN_PASSWORD) {
    return { success: false, message: "Wrong password" };
  }

  try {
    const res = db.deleteDelivery(id);
    emitUpdate("deliveries:updated");
    emitUpdate("transactions:updated");
    return { success: true, result: res };
  } catch (err) {
    console.error("DELETE DELIVERY ERROR:", err);
    return { success: false, message: "DB error" };
  }
});

/* =========================
   IPC — PAYMENTS
========================= */
ipcMain.handle("payment:add", (_, data) => {
  ensureDB();

  const enriched = {
    ...data,
    id: data.id || crypto.randomUUID(),
  };

  const res = db.addPayment(enriched);
  emitUpdate("payments:updated");
  emitUpdate("transactions:updated");
  return res;
});

ipcMain.handle("payment:get", () => {
  ensureDB();
  return db.getPayments();
});

/* =========================
   IPC — TRANSACTIONS
========================= */
ipcMain.handle("transaction:add", (_, data) => {
  ensureDB();
  const res = db.addTransaction(data);
  emitUpdate("transactions:updated");
  return res;
});

ipcMain.handle("transaction:get", () => {
  ensureDB();
  return db.getTransactions();
});

ipcMain.handle("docx:getTemplate", () => {
  const templatePath = path.join(
    app.getAppPath(),
    "electron",
    "assets",
    "Sample_Palamboon.docx"
  );

  return fs.readFileSync(templatePath);
});