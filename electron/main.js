require("dotenv").config();

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const crypto = require("crypto");
const db = require("./db");
const { syncToRemote, checkOnline, getPendingCount } = require("./sync");

let dbReady = false;
let mainWindow = null;
let syncInterval = null;

/* =========================
   WAIT FOR VITE (DEV ONLY)
   Retries until localhost:5173 responds, so Electron
   doesn't load a blank page before Vite is ready.
========================= */
function waitForVite(url, retries = 20, interval = 500) {
  return new Promise((resolve) => {
    const http = require("http");

    function attempt(remaining) {
      const req = http.get(url, (res) => {
        if (res.statusCode < 500) {
          resolve(); // Vite is up
        } else if (remaining > 0) {
          setTimeout(() => attempt(remaining - 1), interval);
        } else {
          resolve(); // give up waiting, try anyway
        }
      });

      req.on("error", () => {
        if (remaining > 0) {
          setTimeout(() => attempt(remaining - 1), interval);
        } else {
          resolve(); // give up, let Electron try anyway
        }
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
   EMIT TO UI
========================= */
function emitUpdate(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

/* =========================
   SYNC RUNNER
   Called on startup and every SYNC_INTERVAL_MS.
========================= */
const SYNC_INTERVAL_MS = 60_000; // 60 seconds

async function runSync() {
  if (!dbReady) return;

  emitUpdate("sync:status", { syncing: true, online: true });

  const result = await syncToRemote(db, (msg) => {
    emitUpdate("sync:progress", msg);
  });

  const pending = getPendingCount(db);

  emitUpdate("sync:status", {
    syncing: false,
    online: result.success || result.errors[0] !== "Device is offline",
    pending,
    lastSync: result.success ? new Date().toISOString() : null,
    errors: result.errors,
  });

  // Refresh affected data in UI after sync
  if (result.pushed > 0) {
    emitUpdate("farmers:updated");
    emitUpdate("deliveries:updated");
    emitUpdate("payments:updated");
    emitUpdate("beans:updated");
  }
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
    console.error("🔥 DB FAILED:", err);
    return;
  }

  // Initial sync attempt on startup
  runSync();

  // Periodic sync
  syncInterval = setInterval(runSync, SYNC_INTERVAL_MS);
});

app.on("window-all-closed", () => {
  if (syncInterval) clearInterval(syncInterval);
  app.quit();
});

/* =========================
   DB SAFETY
========================= */
function ensureDB() {
  if (!dbReady) throw new Error("Database not ready");
}

/* =========================
   IPC — SYNC
========================= */
// Manual sync trigger from UI
ipcMain.handle("sync:trigger", async () => {
  ensureDB();
  await runSync();
  return { ok: true };
});

// Check if online (for UI badge)
ipcMain.handle("sync:checkOnline", async () => {
  return await checkOnline();
});

// How many records are waiting to sync
ipcMain.handle("sync:pending", () => {
  ensureDB();
  return getPendingCount(db);
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

  const ADMIN_PASSWORD = "admin123";
  if (password !== ADMIN_PASSWORD) {
    return { success: false, message: "Wrong password" };
  }

  try {
    db.deleteDelivery(id);
    emitUpdate("deliveries:updated");
    emitUpdate("transactions:updated");
    return { success: true };
  } catch (err) {
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
    id: crypto.randomUUID(),
  };

  const res = db.addPayment(enriched);
  emitUpdate("payments:updated");
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

/* =========================
   IPC — USERS
========================= */
ipcMain.handle("user:add", (_, data) => {
  ensureDB();
  const res = db.addUser(data);
  emitUpdate("users:updated");
  return res;
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

  return { success: true, user };
});

/* =========================
   IPC — PRINT
========================= */
ipcMain.handle("form:print", async (_, data) => {
  try {
    const printWindow = new BrowserWindow({ show: false });

    const html = `
      <html>
        <body style="font-family: Arial; padding: 20px;">
          <h2>Form Preview</h2>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>ID:</strong> ${data.idNumber}</p>
          <p><strong>Total:</strong> ₱${data.amountInFigures}</p>
          <hr />
          <table border="1" cellpadding="5" cellspacing="0" width="100%">
            <thead>
              <tr>
                <th>Particulars</th>
                <th>Volume</th>
                <th>Unit Cost</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${data.rows
                .map(
                  (r) => `
                <tr>
                  <td>${r.particulars}</td>
                  <td>${r.volume}</td>
                  <td>${r.unitCost}</td>
                  <td>${r.totalAmount}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    await printWindow.loadURL(
      "data:text/html;charset=utf-8," + encodeURIComponent(html)
    );

    const pdf = await printWindow.webContents.printToPDF({
      printBackground: true,
    });

    printWindow.close();
    return pdf;
  } catch (err) {
    console.error("PRINT ERROR:", err);
    throw err;
  }
});