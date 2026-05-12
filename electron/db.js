const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");
const { app } = require("electron");

let SQL;
let db;

const dbPath = app
  ? path.join(app.getPath("userData"), "local.sqlite")
  : path.join(__dirname, "local.sqlite");

/* =========================
   SEED ADMIN
========================= */
function seedAdminUser() {
  const users = getUsers();
  if (users.length === 0) {
    addUser({
      id: "admin-1",
      username: "admin",
      password: "admin123",
      role: "admin",
      name: "Administrator",
      sex: "",
      age: null,
      position: "System Admin",
    });
    console.log("🔥 Admin user created");
  }
}

/* =========================
   INIT DB
========================= */
async function initDB() {
  SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
    createTables();
    saveDB();
  }

  // Always run migrations — safe to call on existing DBs
  runMigrations();
  seedAdminUser();
}

/* =========================
   MIGRATIONS
   Adds `synced` column to existing tables without breaking anything.
   ALTER TABLE in SQLite ignores errors if column already exists via try/catch.
========================= */
function runMigrations() {
  const migrations = [
    `ALTER TABLE beans ADD COLUMN synced INTEGER DEFAULT 0`,
    `ALTER TABLE farmers ADD COLUMN synced INTEGER DEFAULT 0`,
    `ALTER TABLE deliveries ADD COLUMN synced INTEGER DEFAULT 0`,
    `ALTER TABLE payments ADD COLUMN synced INTEGER DEFAULT 0`,
  ];

  for (const sql of migrations) {
    try {
      db.run(sql);
    } catch {
      // Column already exists — safe to ignore
    }
  }

  saveDB();
}

/* =========================
   SAVE DB
========================= */
function saveDB() {
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

/* =========================
   HELPERS
========================= */
function run(query, params = []) {
  db.run(query, params);
  saveDB();
}

function all(query, params = []) {
  const stmt = db.prepare(query);
  stmt.bind(params);

  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }

  stmt.free();
  return rows;
}

/* =========================
   TABLES
========================= */
function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS beans (
      id TEXT PRIMARY KEY,
      beanName TEXT,
      pricePerUnit REAL,
      unit TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      synced INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS deliveries (
      id TEXT PRIMARY KEY,
      farmer TEXT,
      farmerContact TEXT,
      beanType TEXT,
      courier TEXT,
      date TEXT,
      deliveryGuy TEXT,
      consignee TEXT,
      deliveryGuyContact TEXT,
      consigneeContact TEXT,
      proofOfDelivery TEXT,
      recordedBy TEXT,
      volume REAL,
      pricePerUnit REAL,
      totalAmount REAL,
      createdAt TEXT,
      updatedAt TEXT,
      synced INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS farmers (
      id TEXT PRIMARY KEY,
      farmerID TEXT,
      name TEXT,
      sex TEXT,
      age INTEGER,
      residentialAddress TEXT,
      farmAddress TEXT,
      contactNumber TEXT,
      emailAddress TEXT,
      beans TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      synced INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      deliveryId TEXT,
      farmerName TEXT,
      amountPaid REAL,
      paymentMethod TEXT,
      notes TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      synced INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      farmerName TEXT,
      beanType TEXT,
      volume REAL,
      amount REAL,
      date TEXT,
      remarks TEXT,
      createdBy TEXT,
      createdAt TEXT,
      updatedAt TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'user',
      name TEXT,
      sex TEXT,
      age INTEGER,
      position TEXT,
      createdAt TEXT,
      updatedAt TEXT
    )
  `);
}

/* =========================
   BEANS
========================= */
function addBean(bean) {
  const now = new Date().toISOString();

  run(
    `
    INSERT INTO beans (id, beanName, pricePerUnit, unit, createdAt, updatedAt, synced)
    VALUES (?, ?, ?, ?, ?, ?, 0)
    ON CONFLICT(id) DO UPDATE SET
      beanName = excluded.beanName,
      pricePerUnit = excluded.pricePerUnit,
      unit = excluded.unit,
      updatedAt = excluded.updatedAt,
      synced = 0
    `,
    [bean.id, bean.beanName, bean.pricePerUnit, bean.unit || "kg", now, now]
  );
}

function getBeans() {
  return all(`SELECT * FROM beans`);
}

function deleteBean(id) {
  run(`DELETE FROM beans WHERE id = ?`, [id]);
}

/* =========================
   FARMERS
========================= */
function addFarmer(f) {
  const now = new Date().toISOString();

  run(
    `
    INSERT INTO farmers (
      id, farmerID, name, sex, age,
      residentialAddress, farmAddress,
      contactNumber, emailAddress, beans,
      createdAt, updatedAt, synced
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    ON CONFLICT(id) DO UPDATE SET
      farmerID = excluded.farmerID,
      name = excluded.name,
      sex = excluded.sex,
      age = excluded.age,
      residentialAddress = excluded.residentialAddress,
      farmAddress = excluded.farmAddress,
      contactNumber = excluded.contactNumber,
      emailAddress = excluded.emailAddress,
      beans = excluded.beans,
      updatedAt = excluded.updatedAt,
      synced = 0
    `,
    [
      f.id,
      f.farmerID,
      f.name,
      f.sex,
      f.age,
      f.residentialAddress,
      f.farmAddress,
      f.contactNumber,
      f.emailAddress,
      JSON.stringify(f.beans || []),
      now,
      now,
    ]
  );
}

function getFarmers() {
  return all(`SELECT * FROM farmers`);
}

function updateFarmer(id, f) {
  const now = new Date().toISOString();

  run(
    `UPDATE farmers SET
      farmerID = ?,
      name = ?,
      sex = ?,
      age = ?,
      residentialAddress = ?,
      farmAddress = ?,
      contactNumber = ?,
      emailAddress = ?,
      beans = ?,
      updatedAt = ?,
      synced = 0
    WHERE id = ?`,
    [
      f.farmerID,
      f.name,
      f.sex,
      f.age,
      f.residentialAddress,
      f.farmAddress,
      f.contactNumber,
      f.emailAddress,
      JSON.stringify(f.beans || []),
      now,
      id,
    ]
  );
}

function deleteFarmer(id) {
  run(`DELETE FROM farmers WHERE id = ?`, [id]);
}

/* =========================
   DELIVERIES
========================= */
function addDelivery(d) {
  const now = new Date().toISOString();
  const total = (d.volume || 0) * (d.pricePerUnit || 0);

  run(
    `INSERT INTO deliveries VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0
    )`,
    [
      d.id,
      d.farmer,
      d.farmerContact,
      d.beanType,
      d.courier,
      d.date,
      d.deliveryGuy,
      d.consignee,
      d.deliveryGuyContact,
      d.consigneeContact,
      d.proofOfDelivery,
      d.recordedBy,
      d.volume,
      d.pricePerUnit,
      total,
      now,
      now,
    ]
  );

  syncTransactionsFromDeliveries();
}

function getDeliveries() {
  return all(`SELECT * FROM deliveries`);
}

function deleteDelivery(id) {
  run(`DELETE FROM deliveries WHERE id = ?`, [id]);
  syncTransactionsFromDeliveries();
}

/* =========================
   TRANSACTIONS SYNC
========================= */
function syncTransactionsFromDeliveries() {
  run(`DELETE FROM transactions`);

  const deliveries = getDeliveries();

  deliveries.forEach((d) => {
    run(
      `INSERT INTO transactions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        d.id,
        d.farmer,
        d.beanType,
        d.volume,
        d.totalAmount,
        d.date,
        "Auto-generated from delivery",
        d.recordedBy,
        new Date().toISOString(),
        new Date().toISOString(),
      ]
    );
  });
}

/* =========================
   PAYMENTS
========================= */
function addPayment(p) {
  const now = new Date().toISOString();

  const payment = {
    id: p.id || String(Date.now()),
    deliveryId: p.deliveryId || "",
    farmerName: p.farmerName || "",
    amountPaid: Number(p.amountPaid || 0),
    paymentMethod: p.paymentMethod || "Cash",
    notes: p.notes || "",
    createdAt: now,
    updatedAt: now,
  };

  run(
    `INSERT INTO payments VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      payment.id,
      payment.deliveryId,
      payment.farmerName,
      payment.amountPaid,
      payment.paymentMethod,
      payment.notes,
      payment.createdAt,
      payment.updatedAt,
    ]
  );
}

function getPayments() {
  return all(`SELECT * FROM payments`);
}

/* =========================
   TRANSACTIONS
========================= */
function addTransaction(t) {
  const now = new Date().toISOString();

  run(
    `INSERT INTO transactions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      t.id,
      t.farmerName,
      t.beanType,
      t.volume,
      t.amount,
      t.date || now,
      t.remarks || "",
      t.createdBy || "",
      now,
      now,
    ]
  );
}

function getTransactions() {
  return all(`SELECT * FROM transactions`);
}

/* =========================
   USERS
========================= */
function addUser(u) {
  const now = new Date().toISOString();

  run(
    `INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      u.id,
      u.username,
      u.password,
      u.role || "user",
      u.name || "",
      u.sex || "",
      u.age || null,
      u.position || "",
      now,
      now,
    ]
  );
}

function getUsers() {
  return all(`SELECT * FROM users`);
}

function getUserByUsername(username) {
  return all(`SELECT * FROM users WHERE username = ?`, [username]);
}

function deleteUser(id) {
  run(`DELETE FROM users WHERE id = ?`, [id]);
}

/* =========================
   EXPORT
========================= */
module.exports = {
  initDB,
  // raw helpers exposed for sync.js
  all,
  run,
  // beans
  addBean,
  getBeans,
  deleteBean,
  // farmers
  addFarmer,
  getFarmers,
  updateFarmer,
  deleteFarmer,
  // deliveries
  addDelivery,
  getDeliveries,
  deleteDelivery,
  // payments
  addPayment,
  getPayments,
  // transactions
  addTransaction,
  getTransactions,
  // users
  addUser,
  getUsers,
  getUserByUsername,
  deleteUser,
};