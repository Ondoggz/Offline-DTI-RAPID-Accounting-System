const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  /* =========================
     BEANS
  ========================= */
  addBean: (data) => ipcRenderer.invoke("bean:add", data),
  getBeans: () => ipcRenderer.invoke("bean:get"),
  deleteBean: (id) => ipcRenderer.invoke("bean:delete", id),

  /* =========================
     FARMERS
  ========================= */
  addFarmer: (data) => ipcRenderer.invoke("farmer:add", data),
  getFarmers: () => ipcRenderer.invoke("farmer:get"),
  updateFarmer: (id, data) =>
    ipcRenderer.invoke("farmer:update", { id, data }),
  deleteFarmer: (id) => ipcRenderer.invoke("farmer:delete", id),

  /* =========================
     DELIVERIES
  ========================= */
  addDelivery: (data) => ipcRenderer.invoke("delivery:add", data),
  getDeliveries: () => ipcRenderer.invoke("delivery:get"),
  deleteDelivery: (id, password) =>
    ipcRenderer.invoke("delivery:delete", { id, password }),

  /* =========================
     PAYMENTS
  ========================= */
  addPayment: (data) => ipcRenderer.invoke("payment:add", data),
  getPayments: () => ipcRenderer.invoke("payment:get"),

  /* =========================
     TRANSACTIONS
  ========================= */
  getTransactions: () => ipcRenderer.invoke("transaction:get"),

  /* =========================
     USERS
  ========================= */
  addUser: (data) => ipcRenderer.invoke("user:add", data),
  getUsers: () => ipcRenderer.invoke("user:get"),
  findUser: (username) => ipcRenderer.invoke("user:find", username),
  deleteUser: (id) => ipcRenderer.invoke("user:delete", id),

  /* =========================
     AUTH
  ========================= */
  login: (username, password) =>
    ipcRenderer.invoke("user:login", { username, password }),

  /* =========================
     PRINT
  ========================= */
  printForm: (data) => ipcRenderer.invoke("form:print", data),

  /* =========================
     SYNC
  ========================= */
  // Manually trigger a sync (e.g. from a "Sync Now" button)
  syncNow: () => ipcRenderer.invoke("sync:trigger"),

  // Check if the remote server is reachable right now
  checkOnline: () => ipcRenderer.invoke("sync:checkOnline"),

  // Get count of records not yet pushed to remote
  getPendingCount: () => ipcRenderer.invoke("sync:pending"),

  // Listen for sync status updates from the main process
  // Returns an unsubscribe function — call it in useEffect cleanup
  onSyncStatus: (callback) => {
    const handler = (_, status) => callback(status);
    ipcRenderer.on("sync:status", handler);
    return () => ipcRenderer.removeListener("sync:status", handler);
  },

  // Listen for fine-grained sync progress messages (optional, for a log view)
  onSyncProgress: (callback) => {
    const handler = (_, msg) => callback(msg);
    ipcRenderer.on("sync:progress", handler);
    return () => ipcRenderer.removeListener("sync:progress", handler);
  },

  // Listen for data refresh events emitted after a sync completes
  onDataUpdated: (channel, callback) => {
    const handler = () => callback();
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
});