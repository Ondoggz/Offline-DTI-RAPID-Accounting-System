const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
 //beans/products
  addBean: (data) => ipcRenderer.invoke("bean:add", data),
  getBeans: () => ipcRenderer.invoke("bean:get"),
  deleteBean: (id) => ipcRenderer.invoke("bean:delete", id),

//farmers
  addFarmer: (data) => ipcRenderer.invoke("farmer:add", data),
  getFarmers: () => ipcRenderer.invoke("farmer:get"),
  updateFarmer: (id, data) => ipcRenderer.invoke("farmer:update", { id, data }),
  deleteFarmer: (id) => ipcRenderer.invoke("farmer:delete", id),

//deliveries
  addDelivery: (data) => ipcRenderer.invoke("delivery:add", data),
  getDeliveries: () => ipcRenderer.invoke("delivery:get"),
  deleteDelivery: (id, password) => ipcRenderer.invoke("delivery:delete", { id, password }),
//payments
  addPayment: (data) => ipcRenderer.invoke("payment:add", data),
  getPayments: () => ipcRenderer.invoke("payment:get"),

//transactions
  getTransactions: () => ipcRenderer.invoke("transaction:get"),

//users
  addUser: (data) => ipcRenderer.invoke("user:add", data),
  getUsers: () => ipcRenderer.invoke("user:get"),
  findUser: (username) => ipcRenderer.invoke("user:find", username),
  updateUser: (data) => ipcRenderer.invoke("user:update", data),
  deleteUser: (id) => ipcRenderer.invoke("user:delete", id),

//auth
  login: (username, password) => ipcRenderer.invoke("user:login", { username, password }),
  getSession: () => ipcRenderer.invoke("user:session"),
  logout: () => ipcRenderer.invoke("user:logout"),

//print
  printForm: (data) => ipcRenderer.invoke("form:print", data),

//sync
  syncNow: () => ipcRenderer.invoke("sync:trigger"),
  checkOnline: () => ipcRenderer.invoke("sync:checkOnline"),
  getPendingCount: () => ipcRenderer.invoke("sync:pending"),

  onSyncStatus: (callback) => {
    const handler = (_, status) => callback(status);
    ipcRenderer.on("sync:status", handler);
    return () => ipcRenderer.removeListener("sync:status", handler);
  },

  onSyncProgress: (callback) => {
    const handler = (_, msg) => callback(msg);
    ipcRenderer.on("sync:progress", handler);
    return () => ipcRenderer.removeListener("sync:progress", handler);
  },

  onDataUpdated: (channel, callback) => {
    const handler = () => callback();
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },

  getTemplate: () => ipcRenderer.invoke("docx:getTemplate")
});