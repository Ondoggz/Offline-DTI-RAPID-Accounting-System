const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const db = require("./db");

let dbReady = false;

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  const isDev = !app.isPackaged;

  mainWindow.loadURL(
    isDev
      ? "http://localhost:5173"
      : `file://${path.join(__dirname, "../client/dist/index.html")}`
  );
}

/* =========================
   APP INIT
========================= */
app.whenReady().then(async () => {
  await db.initDB();
  dbReady = true;

  createWindow();
});

app.on("window-all-closed", () => {
  app.quit();
});

/* =========================
   SAFE WRAPPER
========================= */
function ensureDB() {
  if (!dbReady) throw new Error("Database not ready");
}

/* =========================
   HELPER: EMIT UPDATE
========================= */
function emitUpdate(channel) {
  if (mainWindow) {
    mainWindow.webContents.send(channel);
  }
}

/* =========================
   BEANS
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
   FARMERS
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
   DELIVERIES
========================= */
ipcMain.handle("delivery:add", (_, data) => {
  ensureDB();
  const res = db.addDelivery(data);

  emitUpdate("deliveries:updated");
  emitUpdate("transactions:updated"); // 🔥 important for your history

  return res;
});

ipcMain.handle("delivery:get", () => {
  ensureDB();
  return db.getDeliveries();
});

ipcMain.handle("delivery:delete", (_, payload) => {
  ensureDB();

  const { id, password } = payload || {};

  if (!id) {
    return { success: false, message: "Missing ID" };
  }

  const ADMIN_PASSWORD = "admin123";

  if (password !== ADMIN_PASSWORD) {
    return { success: false, message: "Wrong password" };
  }

  try {
    const res = db.deleteDelivery(id);

    emitUpdate("deliveries:updated");
    emitUpdate("transactions:updated"); // 🔥 sync UI

    return { success: true };
  } catch (err) {
    return { success: false, message: "DB error" };
  }
});

/* =========================
   PAYMENTS
========================= */
ipcMain.handle("payment:add", (_, data) => {
  ensureDB();

  const enriched = {
    ...data,
    id: crypto.randomUUID(),
  };

  return db.addPayment(enriched);
});

ipcMain.handle("payment:get", () => {
  ensureDB();
  return db.getPayments();
});

/* =========================
   TRANSACTIONS
========================= */
ipcMain.handle("transaction:add", (_, data) => {
  ensureDB();
  return db.addTransaction(data);
});

ipcMain.handle("transaction:get", () => {
  ensureDB();
  return db.getTransactions();
});

/* =========================
   USERS
========================= */
ipcMain.handle("user:add", (_, data) => {
  ensureDB();
  return db.addUser(data);
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
  return db.deleteUser(id);
});

/* =========================
   AUTH
========================= */
ipcMain.handle("user:login", (_, { username, password }) => {
  ensureDB();

  const users = db.getUserByUsername(username);
  const user = users[0];

  if (!user) {
    return { success: false, message: "User not found" };
  }

  if (user.password !== password) {
    return { success: false, message: "Incorrect password" };
  }

  return { success: true, user };
});