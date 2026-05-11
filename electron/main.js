const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const db = require("./db");

let dbReady = false;

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  const isDev = !app.isPackaged;

  win.loadURL(
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
   BEANS
========================= */
ipcMain.handle("bean:add", (_, data) => {
  ensureDB();
  return db.addBean(data);
});

ipcMain.handle("bean:get", () => {
  ensureDB();
  return db.getBeans();
});

ipcMain.handle("bean:delete", (_, id) => db.deleteBean(id));

/* =========================
   FARMERS
========================= */
ipcMain.handle("farmer:add", (_, data) => {
  ensureDB();
  return db.addFarmer(data);
});

ipcMain.handle("farmer:get", () => {
  ensureDB();
  return db.getFarmers();
});

ipcMain.handle("farmer:update", (_, { id, data }) => {
  return db.updateFarmer(id, data);
});

ipcMain.handle("farmer:delete", (_, id) => {
  return db.deleteFarmer(id);
});

/* =========================
   DELIVERIES
========================= */
ipcMain.handle("delivery:add", (_, data) => {
  ensureDB();
  return db.addDelivery(data);
});

ipcMain.handle("delivery:get", () => {
  ensureDB();
  return db.getDeliveries();
});

ipcMain.handle("delivery:delete", (_, payload) => {
  ensureDB();

  console.log("RAW DELETE PAYLOAD:", payload);

  const { id, password } = payload || {};

  if (!id) {
    return { success: false, message: "Missing ID" };
  }

  const ADMIN_PASSWORD = "admin123";

  if (password !== ADMIN_PASSWORD) {
    return { success: false, message: "Wrong password" };
  }

  try {
    db.deleteDelivery(id);
    console.log("DELETED FROM DB:", id);

    return { success: true };
  } catch (err) {
    console.error("DB DELETE ERROR:", err);
    return { success: false, message: "DB error" };
  }
});

/* =========================
   PAYMENTS
========================= */
ipcMain.handle("payment:add", (_, data) => {
  ensureDB();
  return db.addPayment(data);
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
   AUTH (LOGIN)
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