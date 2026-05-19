/**
 * sync.js — Offline-first sync engine
 *
 * Pushes locally-created records (synced = 0) to the remote web app.
 * Pulls remote records back into local SQLite.
 *
 * Tables synced: users, beans, farmers, deliveries, payments.
 */

const https = require("https");
const http = require("http");
const { URL } = require("url");

/* =========================
   CONFIG
========================= */
const REMOTE_BASE_URL = (
  process.env.REMOTE_API_URL ||
  "https://dti-accounting-system.onrender.com"
).replace(/\/$/, "");

const SYNC_USERNAME = process.env.SYNC_USERNAME || "admin";
const SYNC_PASSWORD = process.env.SYNC_PASSWORD || "admin123";

const REQUEST_TIMEOUT = 15000;

let authToken = null;

/* =========================
   NETWORK CHECK
========================= */
function checkOnline() {
  return new Promise((resolve) => {
    try {
      const url = new URL(`${REMOTE_BASE_URL}/api`);
      const lib = url.protocol === "https:" ? https : http;

      const req = lib.get(
        {
          hostname: url.hostname,
          port: url.port || (url.protocol === "https:" ? 443 : 80),
          path: url.pathname,
          timeout: 5000,
        },
        (res) => {
          resolve(res.statusCode < 500);
        }
      );

      req.on("error", () => resolve(false));

      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

/* =========================
   HTTP HELPER
========================= */
function remoteRequest(method, path, body = null, skipAuth = false) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${REMOTE_BASE_URL}${path}`);
    const lib = url.protocol === "https:" ? https : http;
    const payload = body ? JSON.stringify(body) : null;

    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
      ...(!skipAuth && authToken
        ? { Authorization: `Bearer ${authToken}` }
        : {}),
    };

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers,
      timeout: REQUEST_TIMEOUT,
    };

    const req = lib.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        let body = data;

        try {
          body = data ? JSON.parse(data) : {};
        } catch {
          body = data;
        }

        resolve({
          status: res.statusCode,
          body,
        });
      });
    });

    req.on("error", reject);

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });

    if (payload) req.write(payload);
    req.end();
  });
}

/* =========================
   LOGIN
========================= */
async function loginToRemote() {
  authToken = null;

  try {
    console.log("[SYNC LOGIN] URL:", `${REMOTE_BASE_URL}/auth/login`);
    console.log("[SYNC LOGIN] USER:", SYNC_USERNAME);
    console.log("[SYNC LOGIN] PASSWORD SET:", Boolean(SYNC_PASSWORD));

    const res = await remoteRequest(
      "POST",
      "/auth/login",
      {
        username: SYNC_USERNAME,
        password: SYNC_PASSWORD,
      },
      true
    );

    console.log("[SYNC LOGIN RESPONSE]", res.status, res.body);

    if (res.status >= 200 && res.status < 300 && res.body?.token) {
      authToken = res.body.token;
      console.log("[SYNC] Authenticated with remote ✓");
      return true;
    }

    console.error("[SYNC] Login failed:", res.status, JSON.stringify(res.body));
    return false;
  } catch (err) {
    console.error("[SYNC] Login error:", err.message);
    return false;
  }
}

/* =========================
   REMOTE DELETE HELPER
========================= */
async function deleteRemoteRecord(path, body = null) {
  if (!authToken) {
    const loggedIn = await loginToRemote();

    if (!loggedIn) {
      throw new Error("Could not authenticate with remote server");
    }
  }

  const res = await remoteRequest("DELETE", path, body);

  if (res.status === 404) {
    return {
      success: true,
      alreadyDeleted: true,
      body: res.body,
    };
  }

  if (res.status < 200 || res.status >= 300) {
    throw new Error(
      `Remote delete failed: ${res.status} ${JSON.stringify(res.body)}`
    );
  }

  return {
    success: true,
    body: res.body,
  };
}

/* =========================
   HELPERS
========================= */
function safeJsonParse(value, fallback = []) {
  if (!value) return fallback;
  if (Array.isArray(value)) return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase();
}

function firstArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.users)) return value.users;
  if (Array.isArray(value?.beans)) return value.beans;
  if (Array.isArray(value?.farmers)) return value.farmers;
  if (Array.isArray(value?.deliveries)) return value.deliveries;
  if (Array.isArray(value?.payments)) return value.payments;
  if (Array.isArray(value?.transactions)) return value.transactions;
  return [];
}

function cleanPayload(obj) {
  const cleaned = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

function getRemoteIdFromResponse(body) {
  return (
    body?._id ||
    body?.id ||
    body?.data?._id ||
    body?.data?.id ||
    body?.user?._id ||
    body?.bean?._id ||
    body?.farmer?._id ||
    body?.delivery?._id ||
    body?.payment?._id ||
    null
  );
}

function toIso(value) {
  if (!value) return new Date().toISOString();

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
}

function isRemoteNewer(remoteUpdatedAt, localUpdatedAt) {
  if (!localUpdatedAt) return true;
  if (!remoteUpdatedAt) return false;

  const remoteTime = new Date(remoteUpdatedAt).getTime();
  const localTime = new Date(localUpdatedAt).getTime();

  if (Number.isNaN(remoteTime)) return false;
  if (Number.isNaN(localTime)) return true;

  return remoteTime > localTime;
}

function findLocalByRemoteOrLocalId(db, table, remote) {
  const remoteId = remote?._id ? String(remote._id) : "";
  const localId = remote?.localId ? String(remote.localId) : "";

  if (localId) {
    const byLocalId = db.all(`SELECT * FROM ${table} WHERE id = ?`, [localId]);
    if (byLocalId[0]) return byLocalId[0];
  }

  if (remoteId) {
    const byRemoteId = db.all(`SELECT * FROM ${table} WHERE remoteId = ?`, [
      remoteId,
    ]);
    if (byRemoteId[0]) return byRemoteId[0];
  }

  return null;
}

function shouldApplyRemote(localRow, remoteRow) {
  if (!localRow) return true;

  if (Number(localRow.synced) === 0) {
    return isRemoteNewer(remoteRow.updatedAt, localRow.updatedAt);
  }

  return isRemoteNewer(remoteRow.updatedAt, localRow.updatedAt);
}

/* =========================
   REMOTE LOOKUPS
========================= */
async function fetchRemoteBeanMap() {
  try {
    const res = await remoteRequest("GET", "/api/beans");

    if (res.status !== 200) {
      console.warn("[SYNC] Could not fetch remote beans:", res.status, res.body);
      return {};
    }

    const list = firstArray(res.body);
    const map = {};

    for (const bean of list) {
      const name = bean.beanName || bean.name;
      if (name && bean._id) {
        map[normalizeKey(name)] = bean._id;
      }

      if (bean.localId && bean._id) {
        map[String(bean.localId)] = bean._id;
      }

      if (bean._id) {
        map[String(bean._id)] = bean._id;
      }
    }

    console.log(`[SYNC] Bean map loaded: ${Object.keys(map).length}`);
    return map;
  } catch (err) {
    console.warn("[SYNC] fetchRemoteBeanMap error:", err.message);
    return {};
  }
}

async function fetchRemoteDeliveryMap() {
  const endpoints = ["/api/transactions", "/api/deliveries"];

  for (const endpoint of endpoints) {
    try {
      const res = await remoteRequest("GET", endpoint);

      if (res.status !== 200) {
        console.warn("[SYNC] Could not fetch remote delivery map:", endpoint, res.status);
        continue;
      }

      const list = firstArray(res.body);
      const map = {};

      for (const item of list) {
        if (item.localId && item._id) {
          map[String(item.localId).trim()] = item._id;
        }

        if (item.deliveryId && item._id) {
          map[String(item.deliveryId).trim()] = item._id;
        }
      }

      console.log(
        `[SYNC] Delivery map loaded from ${endpoint}: ${Object.keys(map).length}`
      );

      if (Object.keys(map).length > 0) return map;
    } catch (err) {
      console.warn("[SYNC] fetchRemoteDeliveryMap error:", endpoint, err.message);
    }
  }

  return {};
}

async function fetchRemoteTransactionMaps() {
  const result = {
    localToRemote: {},
    remoteToLocal: {},
  };

  try {
    const res = await remoteRequest("GET", "/api/transactions");

    if (res.status !== 200) {
      console.warn("[SYNC] Could not fetch remote transactions:", res.status, res.body);
      return result;
    }

    const list = firstArray(res.body);

    for (const tx of list) {
      if (tx.localId && tx._id) {
        result.localToRemote[String(tx.localId).trim()] = String(tx._id);
        result.remoteToLocal[String(tx._id).trim()] = String(tx.localId);
      }
    }

    console.log(
      `[SYNC] Transaction maps loaded: localToRemote=${Object.keys(result.localToRemote).length}, remoteToLocal=${Object.keys(result.remoteToLocal).length}`
    );

    return result;
  } catch (err) {
    console.warn("[SYNC] fetchRemoteTransactionMaps error:", err.message);
    return result;
  }
}

/* =========================
   SYNC TARGETS
========================= */
function getSyncTargets(db, beanMap = {}, deliveryMap = {}) {
  return [
    {
      label: "users",
      table: "users",
      remotePath: "/users",
      getUnsynced: () => db.all(`SELECT * FROM users WHERE synced = 0`),
      markSynced: (id, remoteId) => {
        if (db.markRemoteSynced && remoteId) {
          db.markRemoteSynced("users", id, remoteId);
        } else {
          db.run(`UPDATE users SET synced = 1 WHERE id = ?`, [id]);
        }
      },
      toPayload: (row) =>
        cleanPayload({
          localId: row.id,
          name: row.name,
          username: row.username,
          password: row.password,
          sex: row.sex,
          age: row.age ? Number(row.age) : null,
          position: row.position,
          role: row.role || "user",
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }),
    },

    {
      label: "beans",
      table: "beans",
      remotePath: "/api/beans",
      getUnsynced: () => db.all(`SELECT * FROM beans WHERE synced = 0`),
      markSynced: (id, remoteId) => {
        if (db.markRemoteSynced && remoteId) {
          db.markRemoteSynced("beans", id, remoteId);
        } else {
          db.run(`UPDATE beans SET synced = 1 WHERE id = ?`, [id]);
        }
      },
      toPayload: (row) =>
        cleanPayload({
          localId: row.id,
          beanName: row.beanName || row.name,
          pricePerUnit: Number(row.pricePerUnit || 0),
          unit: row.unit || "kg",
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }),
    },

    {
      label: "farmers",
      table: "farmers",
      remotePath: "/api/farmers",
      getUnsynced: () => db.all(`SELECT * FROM farmers WHERE synced = 0`),
      markSynced: (id, remoteId) => {
        if (db.markRemoteSynced && remoteId) {
          db.markRemoteSynced("farmers", id, remoteId);
        } else {
          db.run(`UPDATE farmers SET synced = 1 WHERE id = ?`, [id]);
        }
      },
      toPayload: (row) => {
        const localBeans = safeJsonParse(row.beans, []);

        const resolvedBeanIds = localBeans
          .map((localBeanId) => {
            const localRows = db.all(`SELECT * FROM beans WHERE id = ?`, [
              localBeanId,
            ]);

            const localBean = localRows[0];

            if (!localBean) return null;

            const beanName = localBean.beanName || localBean.name;

            return (
              localBean.remoteId ||
              beanMap[String(localBeanId)] ||
              beanMap[normalizeKey(beanName)] ||
              null
            );
          })
          .filter(Boolean);

        return cleanPayload({
          localId: row.id,
          farmerID: row.farmerID,
          name: row.name,
          sex: row.sex,
          age: Number(row.age || 0),
          residentialAddress: row.residentialAddress,
          farmAddress: row.farmAddress,
          contactNumber: row.contactNumber,
          emailAddress: row.emailAddress,
          beans: resolvedBeanIds,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        });
      },
    },

    {
      label: "deliveries",
      table: "deliveries",
      remotePath: "/api/deliveries",
      getUnsynced: () => db.all(`SELECT * FROM deliveries WHERE synced = 0`),
      markSynced: (id, remoteId) => {
        if (db.markRemoteSynced && remoteId) {
          db.markRemoteSynced("deliveries", id, remoteId);
        } else {
          db.run(`UPDATE deliveries SET synced = 1 WHERE id = ?`, [id]);
        }
      },
      toPayload: (row) =>
        cleanPayload({
          localId: row.id,
          farmer: row.farmer,
          farmerContact: row.farmerContact,
          beanType: row.beanType,
          courier: row.courier,
          date: row.date,
          deliveryGuy: row.deliveryGuy,
          consignee: row.consignee,
          deliveryGuyContact: row.deliveryGuyContact,
          consigneeContact: row.consigneeContact,
          proofOfDelivery: row.proofOfDelivery,
          recordedBy: row.recordedBy,
          volume: Number(row.volume || 0),
          pricePerUnit: Number(row.pricePerUnit || 0),
          totalAmount: Number(row.totalAmount || 0),
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }),
    },

    {
      label: "payments",
      table: "payments",
      remotePath: "/api/payments",
      getUnsynced: () => db.all(`SELECT * FROM payments WHERE synced = 0`),
      markSynced: (id, remoteId) => {
        if (db.markRemoteSynced && remoteId) {
          db.markRemoteSynced("payments", id, remoteId);
        } else {
          db.run(`UPDATE payments SET synced = 1 WHERE id = ?`, [id]);
        }
      },
      toPayload: (row) => {
        const localDeliveryId = String(row.deliveryId || "").trim();

        const localDeliveryRows = db.all(
          `SELECT * FROM deliveries WHERE id = ?`,
          [localDeliveryId]
        );

        const localDelivery = localDeliveryRows[0];

        const remoteDeliveryId =
          deliveryMap[localDeliveryId] ||
          localDelivery?.remoteId ||
          row.remoteDeliveryId ||
          row.deliveryId;

        return cleanPayload({
          localId: row.id,
          deliveryId: remoteDeliveryId,
          farmerName: row.farmerName,
          amountPaid: Number(row.amountPaid || 0),
          paymentMethod: row.paymentMethod,
          notes: row.notes,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        });
      },
    },
  ];
}

/* =========================
   PUSH TO REMOTE
========================= */
async function pushToRemote(db, onProgress = null) {
  const result = {
    pushed: 0,
    failed: 0,
    errors: [],
  };

  const notify = (msg) => {
    console.log(`[SYNC] ${msg}`);
    if (onProgress) onProgress(msg);
  };

  const beanMap = await fetchRemoteBeanMap();
  const deliveryMap = await fetchRemoteDeliveryMap();
  const targets = getSyncTargets(db, beanMap, deliveryMap);

  for (const target of targets) {
    let rows = [];

    try {
      rows = target.getUnsynced();
    } catch (err) {
      const errMsg = `${target.label}: failed to read local table: ${err.message}`;
      result.failed++;
      result.errors.push(errMsg);
      notify(`✗ ${errMsg}`);
      continue;
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      notify(`${target.label}: nothing to push`);
      continue;
    }

    notify(`${target.label}: pushing ${rows.length} record(s)...`);

    for (const row of rows) {
      try {
        const payload = target.toPayload(row);

        console.log("[SYNC PAYLOAD]", target.label, payload);

        const res = await remoteRequest("POST", target.remotePath, payload);

        console.log("[SYNC RESPONSE]", target.label, row.id, res.status, res.body);

        if (res.status >= 200 && res.status < 300) {
          const remoteId = getRemoteIdFromResponse(res.body);
          target.markSynced(row.id, remoteId);

          result.pushed++;
          notify(`${target.label} [${row.id}] ✓ pushed`);
        } else {
          const errMsg = `${target.label} [${row.id}] server returned ${
            res.status
          }: ${JSON.stringify(res.body)}`;

          result.failed++;
          result.errors.push(errMsg);
          notify(`⚠ ${errMsg}`);
        }
      } catch (err) {
        const errMsg = `${target.label} [${row.id}] error: ${err.message}`;

        result.failed++;
        result.errors.push(errMsg);
        notify(`✗ ${errMsg}`);
      }
    }
  }

  return result;
}

/* =========================
   PULL UPSERT HELPERS
========================= */
function upsertRemoteUser(db, user) {
  const localId = String(user.localId || user._id || "").trim();
  const remoteId = String(user._id || "").trim();
  const username = String(user.username || "").trim();

  if (!localId || !remoteId || !username) return false;

  let existing = findLocalByRemoteOrLocalId(db, "users", user);

  if (!existing) {
    const byUsername = db.all(`SELECT * FROM users WHERE username = ?`, [
      username,
    ]);

    existing = byUsername[0] || null;
  }

  if (existing && !shouldApplyRemote(existing, user)) {
    return false;
  }

  if (existing) {
    db.run(
      `
      UPDATE users SET
        remoteId = ?,
        username = ?,
        password = ?,
        role = ?,
        name = ?,
        sex = ?,
        age = ?,
        position = ?,
        createdAt = ?,
        updatedAt = ?,
        synced = 1
      WHERE id = ?
      `,
      [
        remoteId,
        username,
        user.password || existing.password || "",
        user.role || "user",
        user.name || "",
        user.sex || "",
        user.age ? Number(user.age) : null,
        user.position || "",
        toIso(user.createdAt),
        toIso(user.updatedAt),
        existing.id,
      ]
    );

    return true;
  }

  db.run(
    `
    INSERT INTO users (
      id, remoteId, name, username, password,
      sex, age, position, role,
      createdAt, updatedAt, synced
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `,
    [
      localId,
      remoteId,
      user.name || "",
      username,
      user.password || "",
      user.sex || "",
      user.age ? Number(user.age) : null,
      user.position || "",
      user.role || "user",
      toIso(user.createdAt),
      toIso(user.updatedAt),
    ]
  );

  return true;
}

function upsertRemoteBean(db, bean) {
  const localId = String(bean.localId || bean._id || "").trim();
  const remoteId = String(bean._id || "").trim();

  if (!localId || !remoteId) return false;

  const existing = findLocalByRemoteOrLocalId(db, "beans", bean);

  if (!shouldApplyRemote(existing, bean)) return false;

  db.run(
    `
    INSERT INTO beans (
      id, remoteId, beanName, pricePerUnit, unit,
      createdAt, updatedAt, synced
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    ON CONFLICT(id) DO UPDATE SET
      remoteId = excluded.remoteId,
      beanName = excluded.beanName,
      pricePerUnit = excluded.pricePerUnit,
      unit = excluded.unit,
      createdAt = excluded.createdAt,
      updatedAt = excluded.updatedAt,
      synced = 1
    `,
    [
      localId,
      remoteId,
      bean.beanName || bean.name || "",
      Number(bean.pricePerUnit || 0),
      bean.unit || "kg",
      toIso(bean.createdAt),
      toIso(bean.updatedAt),
    ]
  );

  return true;
}

function upsertRemoteFarmer(db, farmer) {
  const localId = String(farmer.localId || farmer._id || "").trim();
  const remoteId = String(farmer._id || "").trim();

  if (!localId || !remoteId) return false;

  const existing = findLocalByRemoteOrLocalId(db, "farmers", farmer);

  if (!shouldApplyRemote(existing, farmer)) return false;

  const localBeans = Array.isArray(farmer.beans)
    ? farmer.beans
        .map((bean) => {
          if (typeof bean === "string") return bean;
          return bean.localId || bean._id || null;
        })
        .filter(Boolean)
    : [];

  db.run(
    `
    INSERT INTO farmers (
      id, remoteId, farmerID, name, sex, age,
      residentialAddress, farmAddress,
      contactNumber, emailAddress, beans,
      createdAt, updatedAt, synced
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    ON CONFLICT(id) DO UPDATE SET
      remoteId = excluded.remoteId,
      farmerID = excluded.farmerID,
      name = excluded.name,
      sex = excluded.sex,
      age = excluded.age,
      residentialAddress = excluded.residentialAddress,
      farmAddress = excluded.farmAddress,
      contactNumber = excluded.contactNumber,
      emailAddress = excluded.emailAddress,
      beans = excluded.beans,
      createdAt = excluded.createdAt,
      updatedAt = excluded.updatedAt,
      synced = 1
    `,
    [
      localId,
      remoteId,
      farmer.farmerID || "",
      farmer.name || "",
      farmer.sex || "",
      Number(farmer.age || 0),
      farmer.residentialAddress || "",
      farmer.farmAddress || "",
      farmer.contactNumber || "",
      farmer.emailAddress || "",
      JSON.stringify(localBeans),
      toIso(farmer.createdAt),
      toIso(farmer.updatedAt),
    ]
  );

  return true;
}

function upsertRemoteDelivery(db, delivery) {
  const localId = String(delivery.localId || delivery._id || "").trim();
  const remoteId = String(delivery._id || "").trim();

  if (!localId || !remoteId) return false;

  const existing = findLocalByRemoteOrLocalId(db, "deliveries", delivery);

  if (!shouldApplyRemote(existing, delivery)) return false;

  const volume = Number(delivery.volume || 0);
  const pricePerUnit = Number(delivery.pricePerUnit || 0);
  const totalAmount = Number(delivery.totalAmount || volume * pricePerUnit || 0);

  db.run(
    `
    INSERT INTO deliveries (
      id, remoteId, farmer, farmerContact, beanType, courier, date,
      deliveryGuy, consignee, deliveryGuyContact, consigneeContact,
      proofOfDelivery, recordedBy, volume, pricePerUnit,
      totalAmount, createdAt, updatedAt, synced
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    ON CONFLICT(id) DO UPDATE SET
      remoteId = excluded.remoteId,
      farmer = excluded.farmer,
      farmerContact = excluded.farmerContact,
      beanType = excluded.beanType,
      courier = excluded.courier,
      date = excluded.date,
      deliveryGuy = excluded.deliveryGuy,
      consignee = excluded.consignee,
      deliveryGuyContact = excluded.deliveryGuyContact,
      consigneeContact = excluded.consigneeContact,
      proofOfDelivery = excluded.proofOfDelivery,
      recordedBy = excluded.recordedBy,
      volume = excluded.volume,
      pricePerUnit = excluded.pricePerUnit,
      totalAmount = excluded.totalAmount,
      createdAt = excluded.createdAt,
      updatedAt = excluded.updatedAt,
      synced = 1
    `,
    [
      localId,
      remoteId,
      delivery.farmer || "",
      delivery.farmerContact || "",
      delivery.beanType || "",
      delivery.courier || "",
      toIso(delivery.date),
      delivery.deliveryGuy || "",
      delivery.consignee || "",
      delivery.deliveryGuyContact || "",
      delivery.consigneeContact || "",
      delivery.proofOfDelivery || "",
      delivery.recordedBy || "",
      volume,
      pricePerUnit,
      totalAmount,
      toIso(delivery.createdAt),
      toIso(delivery.updatedAt),
    ]
  );

  db.run(
    `
    INSERT INTO transactions (
      id, farmerName, beanType, volume, amount,
      date, remarks, createdBy, createdAt, updatedAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      farmerName = excluded.farmerName,
      beanType = excluded.beanType,
      volume = excluded.volume,
      amount = excluded.amount,
      date = excluded.date,
      remarks = excluded.remarks,
      createdBy = excluded.createdBy,
      createdAt = excluded.createdAt,
      updatedAt = excluded.updatedAt
    `,
    [
      localId,
      delivery.farmer || "",
      delivery.beanType || "",
      volume,
      totalAmount,
      toIso(delivery.date),
      "Auto-generated from delivery",
      delivery.recordedBy || "",
      toIso(delivery.createdAt),
      toIso(delivery.updatedAt),
    ]
  );

  return true;
}

function upsertRemotePayment(db, payment, transactionRemoteToLocal = {}) {
  const localId = String(payment.localId || payment._id || "").trim();
  const remoteId = String(payment._id || "").trim();

  if (!localId || !remoteId) return false;

  const existing = findLocalByRemoteOrLocalId(db, "payments", payment);

  if (!shouldApplyRemote(existing, payment)) return false;

  const remoteDeliveryId =
    typeof payment.deliveryId === "object"
      ? String(payment.deliveryId?._id || "")
      : String(payment.deliveryId || "");

  const localDeliveryId =
    transactionRemoteToLocal[remoteDeliveryId] || remoteDeliveryId;

  db.run(
    `
    INSERT INTO payments (
      id, remoteId, deliveryId, farmerName, amountPaid,
      paymentMethod, notes, createdAt, updatedAt, synced
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    ON CONFLICT(id) DO UPDATE SET
      remoteId = excluded.remoteId,
      deliveryId = excluded.deliveryId,
      farmerName = excluded.farmerName,
      amountPaid = excluded.amountPaid,
      paymentMethod = excluded.paymentMethod,
      notes = excluded.notes,
      createdAt = excluded.createdAt,
      updatedAt = excluded.updatedAt,
      synced = 1
    `,
    [
      localId,
      remoteId,
      localDeliveryId,
      payment.farmerName || "",
      Number(payment.amountPaid || 0),
      payment.paymentMethod || "Cash",
      payment.notes || "",
      toIso(payment.createdAt),
      toIso(payment.updatedAt),
    ]
  );

  return true;
}

/* =========================
   PULL FROM REMOTE
========================= */
async function pullFromRemote(db, onProgress = null) {
  const result = {
    pulled: 0,
    failed: 0,
    errors: [],
  };

  const notify = (msg) => {
    console.log(`[SYNC] ${msg}`);
    if (onProgress) onProgress(msg);
  };

  notify("Pulling remote changes...");

  const txMaps = await fetchRemoteTransactionMaps();

  const targets = [
    {
      label: "users",
      remotePath: "/users",
      upsert: (item) => upsertRemoteUser(db, item),
    },
    {
      label: "beans",
      remotePath: "/api/beans",
      upsert: (item) => upsertRemoteBean(db, item),
    },
    {
      label: "farmers",
      remotePath: "/api/farmers",
      upsert: (item) => upsertRemoteFarmer(db, item),
    },
    {
      label: "deliveries",
      remotePath: "/api/deliveries",
      upsert: (item) => upsertRemoteDelivery(db, item),
    },
    {
      label: "payments",
      remotePath: "/api/payments",
      upsert: (item) => upsertRemotePayment(db, item, txMaps.remoteToLocal),
    },
  ];

  for (const target of targets) {
    try {
      const res = await remoteRequest("GET", target.remotePath);

      if (res.status !== 200) {
        const errMsg = `${target.label}: pull failed with status ${res.status}: ${JSON.stringify(res.body)}`;
        result.failed++;
        result.errors.push(errMsg);
        notify(`⚠ ${errMsg}`);
        continue;
      }

      const list = firstArray(res.body);

      if (!Array.isArray(list) || list.length === 0) {
        notify(`${target.label}: nothing to pull`);
        continue;
      }

      let applied = 0;

      for (const item of list) {
        try {
          const changed = target.upsert(item);
          if (changed) {
            applied++;
            result.pulled++;
          }
        } catch (err) {
          const errMsg = `${target.label}: failed to apply remote record ${item?._id || item?.localId || ""}: ${err.message}`;
          result.failed++;
          result.errors.push(errMsg);
          notify(`✗ ${errMsg}`);
        }
      }

      notify(`${target.label}: pulled/applied ${applied} record(s)`);
    } catch (err) {
      const errMsg = `${target.label}: pull error: ${err.message}`;
      result.failed++;
      result.errors.push(errMsg);
      notify(`✗ ${errMsg}`);
    }
  }

  return result;
}

/* =========================
   MAIN SYNC
========================= */
async function syncToRemote(db, onProgress = null) {
  const result = {
    success: true,
    pushed: 0,
    pulled: 0,
    failed: 0,
    errors: [],
  };

  const notify = (msg) => {
    console.log(`[SYNC] ${msg}`);
    if (onProgress) onProgress(msg);
  };

  notify("Starting sync...");
  notify(`Remote: ${REMOTE_BASE_URL}`);

  const online = await checkOnline();

  if (!online) {
    notify("Offline — sync skipped");
    return {
      ...result,
      success: false,
      errors: ["Device is offline"],
    };
  }

  notify("Online — authenticating...");

  const loggedIn = await loginToRemote();

  if (!loggedIn) {
    notify("Auth failed — sync aborted");
    return {
      ...result,
      success: false,
      errors: ["Could not authenticate with remote server"],
    };
  }

  notify("Push phase starting...");
  const pushResult = await pushToRemote(db, onProgress);

  result.pushed += pushResult.pushed;
  result.failed += pushResult.failed;
  result.errors.push(...pushResult.errors);

  notify("Pull phase starting...");
  const pullResult = await pullFromRemote(db, onProgress);

  result.pulled += pullResult.pulled;
  result.failed += pullResult.failed;
  result.errors.push(...pullResult.errors);

  result.success = result.failed === 0;

  notify(
    `Sync complete — pushed: ${result.pushed}, pulled: ${result.pulled}, failed: ${result.failed}`
  );

  return result;
}

/* =========================
   PENDING COUNT
========================= */
function getPendingCount(db) {
  let total = 0;

  for (const table of ["users", "beans", "farmers", "deliveries", "payments"]) {
    try {
      const rows = db.all(
        `SELECT COUNT(*) as n FROM ${table} WHERE synced = 0`
      );

      total += rows[0]?.n || 0;
    } catch {}
  }

  return total;
}

module.exports = {
  syncToRemote,
  pullFromRemote,
  checkOnline,
  getPendingCount,
  deleteRemoteRecord,
};