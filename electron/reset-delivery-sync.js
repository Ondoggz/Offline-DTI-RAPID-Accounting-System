/**
 * reset-delivery-sync.js
 *
 * One-time script to reset all deliveries to synced = 0
 * so they re-push to remote with localId this time.
 *
 * Run from your project root:
 *   node electron/reset-delivery-sync.js
 *
 * After running, restart the app and deliveries will re-push.
 * Existing remote Transactions will get duplicate entries —
 * clean those up manually in MongoDB Compass or Atlas UI
 * by deleting transactions where localId IS NOT null
 * and keeping the originals.
 *
 * OR — safer option — delete all remote transactions first,
 * then let the app re-push everything cleanly.
 */

const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");
const os = require("os");

// userData path (same as Electron uses)
const userDataPath = path.join(os.homedir(), "AppData", "Roaming", "offline-dti-system");
const dbPath = path.join(userDataPath, "local.sqlite");

async function main() {
  if (!fs.existsSync(dbPath)) {
    console.error("❌ Database not found at:", dbPath);
    console.error("Make sure the app has been run at least once.");
    process.exit(1);
  }

  console.log("📂 Opening database at:", dbPath);

  const SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(fileBuffer);

  // Check current state
  const before = db.exec("SELECT COUNT(*) as n FROM deliveries WHERE synced = 1");
  const syncedCount = before[0]?.values[0][0] || 0;
  console.log(`📊 Currently synced deliveries: ${syncedCount}`);

  // Reset all deliveries to unsynced
  db.run("UPDATE deliveries SET synced = 0");

  // Also reset payments — they depend on deliveries being on remote first
  db.run("UPDATE payments SET synced = 0");

  // Save
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  db.close();

  console.log("✅ Reset complete — all deliveries and payments marked unsynced.");
  console.log("🔁 Restart the Electron app to re-push with localId.");
  console.log("");
  console.log("⚠️  IMPORTANT: You will get duplicate Transaction entries on remote.");
  console.log("   Clean up old ones (those without localId) in MongoDB Atlas/Compass.");
}

main().catch(console.error);