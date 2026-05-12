/**
 * sync.js — Offline-first sync engine
 *
 * Pushes locally-created records (synced = 0) to the remote web app.
 * Tables synced: beans, farmers, deliveries, payments.
 */

const https = require("https");
const http = require("http");
const { URL } = require("url");

/* =========================
   CONFIG
========================= */
const REMOTE_BASE_URL = (
  process.env.REMOTE_API_URL ||
  "https://dti-accounting-system-backend-ycyg.onrender.com"
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
    }

    console.log(`[SYNC] Bean map loaded: ${Object.keys(map).length}`);
    return map;
  } catch (err) {
    console.warn("[SYNC] fetchRemoteBeanMap error:", err.message);
    return {};
  }
}

async function fetchRemoteDeliveryMap() {
  const endpoints = ["/api/deliveries", "/api/transactions"];

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

/* =========================
   SYNC TARGETS
========================= */
function getSyncTargets(db, beanMap = {}, deliveryMap = {}) {
  return [
    {
      label: "beans",
      remotePath: "/api/beans",
      getUnsynced: () => db.all(`SELECT * FROM beans WHERE synced = 0`),
      markSynced: (id) =>
        db.run(`UPDATE beans SET synced = 1 WHERE id = ?`, [id]),
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
      remotePath: "/api/farmers",
      getUnsynced: () => db.all(`SELECT * FROM farmers WHERE synced = 0`),
      markSynced: (id) =>
        db.run(`UPDATE farmers SET synced = 1 WHERE id = ?`, [id]),
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
      remotePath: "/api/deliveries",
      getUnsynced: () => db.all(`SELECT * FROM deliveries WHERE synced = 0`),
      markSynced: (id) =>
        db.run(`UPDATE deliveries SET synced = 1 WHERE id = ?`, [id]),
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
      remotePath: "/api/payments",
      getUnsynced: () => db.all(`SELECT * FROM payments WHERE synced = 0`),
      markSynced: (id) =>
        db.run(`UPDATE payments SET synced = 1 WHERE id = ?`, [id]),
      toPayload: (row) => {
        const localDeliveryId = String(row.deliveryId || "").trim();
        const remoteDeliveryId =
          deliveryMap[localDeliveryId] || row.remoteDeliveryId || row.deliveryId;

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
   MAIN SYNC
========================= */
async function syncToRemote(db, onProgress = null) {
  const result = {
    success: true,
    pushed: 0,
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
          target.markSynced(row.id);
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

  result.success = result.failed === 0;

  notify(`Sync complete — pushed: ${result.pushed}, failed: ${result.failed}`);

  return result;
}

/* =========================
   PENDING COUNT
========================= */
function getPendingCount(db) {
  let total = 0;

  for (const table of ["beans", "farmers", "deliveries", "payments"]) {
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
  checkOnline,
  getPendingCount,
};