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

  // FIXED: matches your main.js expectation (payload object)
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
     OPTIONAL (RECOMMENDED ADDITION)
     FOR REPORT / PDF PRINTING
  ========================= */

  printForm: (data) => ipcRenderer.invoke("form:print", data),
});