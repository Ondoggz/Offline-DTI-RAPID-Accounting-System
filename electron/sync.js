/**
 * sync.js — Offline-first sync engine
 *
 * Pushes locally-created records (synced = 0) to the remote web app.
 * Uses last-write-wins on updatedAt for conflict resolution.
 */

const https = require("https");
const http = require("http");
const { URL } = require("url");

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const REMOTE_BASE_URL =
  process.env.REMOTE_API_URL || "https://dti-accounting-system-backend-ycyg.onrender.com";

const SYNC_USERNAME = process.env.SYNC_USERNAME || "admin";
const SYNC_PASSWORD = process.env.SYNC_PASSWORD || "admin123";

const REQUEST_TIMEOUT = 8000;

let authToken = null;

// ─── NETWORK CHECK ───────────────────────────────────────────────────────────
function checkOnline() {
  return new Promise((resolve) => {
    const url = new URL(`${REMOTE_BASE_URL}/api`);
    const lib = url.protocol === "https:" ? https : http;

    const req = lib.get(
      { hostname: url.hostname, path: url.pathname, timeout: 4000 },
      (res) => {
        resolve(res.statusCode < 500);
      }
    );

    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
async function loginToRemote() {
  try {
    const res = await remoteRequest("POST", "/auth/login", {
      username: SYNC_USERNAME,
      password: SYNC_PASSWORD,
    }, true);

    if (res.status === 200 && res.body.token) {
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

// ─── HTTP HELPER ─────────────────────────────────────────────────────────────
function remoteRequest(method, path, body, skipAuth = false) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${REMOTE_BASE_URL}${path}`);
    const lib = url.protocol === "https:" ? https : http;
    const payload = body ? JSON.stringify(body) : null;

    const headers = {
      "Content-Type": "application/json",
      ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
      ...(!skipAuth && authToken ? { Authorization: `Bearer ${authToken}` } : {}),
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
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
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

// ─── REMOTE LOOKUPS ──────────────────────────────────────────────────────────
async function fetchRemoteBeanMap() {
  try {
    const res = await remoteRequest("GET", "/api/beans");
    if (res.status === 200 && Array.isArray(res.body)) {
      const map = {};
      for (const bean of res.body) {
        map[bean.beanName.trim().toLowerCase()] = bean._id;
      }
      return map;
    }
    return {};
  } catch (err) {
    return {};
  }
}

async function fetchRemoteDeliveryMap() {
  try {
    const res = await remoteRequest("GET", "/api/transactions");
    const list = Array.isArray(res.body) ? res.body : (res.body?.data || []);
    
    const map = {};
    list.forEach(item => {
      if (item.localId && item._id) {
        // Ensure keys are clean strings to prevent lookup misses
        const key = String(item.localId).trim();
        map[key] = item._id;
      }
    });
    console.log(`[SYNC] Mapped ${Object.keys(map).length} transactions from remote.`);
    return map;
  } catch (err) {
    console.error("[SYNC] Delivery Map Fetch Error:", err.message);
    return {};
  }
}

// ─── TABLE SYNC CONFIG ───────────────────────────────────────────────────────
function getSyncTargets(db, beanMap = {}, deliveryMap = {}) {
  return [
    {
      label: "beans",
      getUnsynced: () => db.all(`SELECT * FROM beans WHERE synced = 0`),
      markSynced: (id) => db.run(`UPDATE beans SET synced = 1 WHERE id = ?`, [id]),
      remotePath: "/api/beans",
      toPayload: (row) => ({
        localId: row.id,
        beanName: row.beanName,
        pricePerUnit: row.pricePerUnit,
        unit: row.unit,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }),
    },
    {
      label: "farmers",
      getUnsynced: () => db.all(`SELECT * FROM farmers WHERE synced = 0`),
      markSynced: (id) => db.run(`UPDATE farmers SET synced = 1 WHERE id = ?`, [id]),
      remotePath: "/api/farmers",
      toPayload: (row) => {
        let localBeans = [];
        try { localBeans = JSON.parse(row.beans || "[]"); } catch {}

        const resolvedBeanIds = localBeans
          .map((localId) => {
            const rows = db.all(`SELECT beanName FROM beans WHERE id = ?`, [localId]);
            const beanName = rows[0]?.beanName;
            if (!beanName) return null;
            return beanMap[beanName.trim().toLowerCase()] || null;
          })
          .filter(Boolean);

        return {
          localId: row.id,
          farmerID: row.farmerID,
          name: row.name,
          sex: row.sex,
          age: row.age,
          residentialAddress: row.residentialAddress,
          farmAddress: row.farmAddress,
          contactNumber: row.contactNumber,
          emailAddress: row.emailAddress,
          beans: resolvedBeanIds,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        };
      },
    },
    {
      label: "deliveries",
      getUnsynced: () => db.all(`SELECT * FROM deliveries WHERE synced = 0`),
      markSynced: (id) => db.run(`UPDATE deliveries SET synced = 1 WHERE id = ?`, [id]),
      remotePath: "/api/deliveries",
      toPayload: (row) => ({
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
        volume: row.volume,
        pricePerUnit: row.pricePerUnit,
        totalAmount: row.totalAmount,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }),
    },
    {
      label: "payments",
      getUnsynced: () => db.all(`SELECT * FROM payments WHERE synced = 0`),
      markSynced: (id) => db.run(`UPDATE payments SET synced = 1 WHERE id = ?`, [id]),
      remotePath: "/api/payments",
      toPayload: (row) => {
        // Strict lookup: Get the remote MongoDB _id for the delivery
        const cleanDeliveryId = String(row.deliveryId).trim();
        const remoteId = deliveryMap[cleanDeliveryId];

        if (!remoteId) {
          // Throws error to current loop, preventing the POST request
          throw new Error(`Skipping payment ${row.id}: No remote _id found for delivery ${row.deliveryId}`);
        }

        return {
          localId: row.id,
          deliveryId: remoteId, // Correct 24-char MongoDB ObjectId
          farmerName: row.farmerName,
          amountPaid: row.amountPaid,
          paymentMethod: row.paymentMethod,
          notes: row.notes,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        };
      },
    },
  ];
}

// ─── MAIN SYNC ───────────────────────────────────────────────────────────────
async function syncToRemote(db, onProgress = null) {
  const result = { success: true, pushed: 0, failed: 0, errors: [] };
  const notify = (msg) => {
    console.log(`[SYNC] ${msg}`);
    if (onProgress) onProgress(msg);
  };

  notify("Starting sync...");

  const online = await checkOnline();
  if (!online) {
    notify("Offline — sync skipped");
    return { ...result, success: false, errors: ["Device is offline"] };
  }

  const loggedIn = await loginToRemote();
  if (!loggedIn) {
    notify("Auth failed — sync aborted");
    return { ...result, success: false, errors: ["Could not authenticate"] };
  }

  // Refresh maps before target loop
  const beanMap = await fetchRemoteBeanMap();
  const deliveryMap = await fetchRemoteDeliveryMap();

  const targets = getSyncTargets(db, beanMap, deliveryMap);

  for (const target of targets) {
    const rows = target.getUnsynced();
    if (rows.length === 0) continue;

    notify(`${target.label}: pushing ${rows.length} record(s)...`);

    for (const row of rows) {
      try {
        const payload = target.toPayload(row);
        const res = await remoteRequest("POST", target.remotePath, payload);

        if (res.status >= 200 && res.status < 300) {
          target.markSynced(row.id);
          result.pushed++;
          notify(`${target.label} [${row.id}] ✓ synced`);
        } else {
          const errMsg = `${target.label} [${row.id}] server error ${res.status}: ${JSON.stringify(res.body)}`;
          result.failed++;
          result.errors.push(errMsg);
          notify(`⚠ ${errMsg}`);
        }
      } catch (err) {
        // Catch mapping errors (like missing IDs) or network errors
        result.failed++;
        result.errors.push(err.message);
        notify(`✗ ${err.message}`);
      }
    }
  }

  result.success = result.failed === 0;
  notify(`Sync complete — pushed: ${result.pushed}, failed: ${result.failed}`);
  return result;
}

function getPendingCount(db) {
  let total = 0;
  for (const table of ["beans", "farmers", "deliveries", "payments"]) {
    try {
      const rows = db.all(`SELECT COUNT(*) as n FROM ${table} WHERE synced = 0`);
      total += rows[0]?.n || 0;
    } catch {}
  }
  return total;
}

module.exports = { syncToRemote, checkOnline, getPendingCount };