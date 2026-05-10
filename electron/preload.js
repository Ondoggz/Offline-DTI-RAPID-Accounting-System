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

  /* =========================
     DELIVERIES
  ========================= */
  addDelivery: (data) => ipcRenderer.invoke("delivery:add", data),
  getDeliveries: () => ipcRenderer.invoke("delivery:get"),

  /* =========================
     PAYMENTS
  ========================= */
  addPayment: (data) => ipcRenderer.invoke("payment:add", data),
  getPayments: () => ipcRenderer.invoke("payment:get"),

  /* =========================
     TRANSACTIONS
  ========================= */
  addTransaction: (data) =>
    ipcRenderer.invoke("transaction:add", data),

  getTransactions: () =>
    ipcRenderer.invoke("transaction:get"),

  /* =========================
     USERS
  ========================= */
  addUser: (data) => ipcRenderer.invoke("user:add", data),

  getUsers: () => ipcRenderer.invoke("user:get"),

  findUser: (username) =>
    ipcRenderer.invoke("user:find", username),

  deleteUser: (id) =>
    ipcRenderer.invoke("user:delete", id),

  /* =========================
     AUTH (LOGIN)
  ========================= */
  login: (username, password) =>
    ipcRenderer.invoke("user:login", { username, password }),
});