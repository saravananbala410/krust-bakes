// Builds the SQLite database file from a Cloudflare D1 export.
//   npx wrangler d1 export krust-db --remote --output live-export.sql
//   node scripts/import-d1-dump.mjs live-export.sql krust.db
// Refuses to overwrite a database that already has data unless --force is given.
import Database from "better-sqlite3";
import fs from "node:fs";

const [dumpPath, dbPath, flag] = process.argv.slice(2);
if (!dumpPath || !dbPath) {
  console.error("Usage: node scripts/import-d1-dump.mjs <export.sql> <database.db> [--force]");
  process.exit(1);
}
if (fs.existsSync(dbPath) && fs.statSync(dbPath).size > 0 && flag !== "--force") {
  console.error(`${dbPath} already exists. Pass --force to replace it.`);
  process.exit(1);
}
for (const f of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) if (fs.existsSync(f)) fs.rmSync(f);

const db = new Database(dbPath);
const sql = fs.readFileSync(dumpPath, "utf8");
db.exec("BEGIN");
try {
  db.exec(sql);
  db.exec("COMMIT");
} catch (error) {
  db.exec("ROLLBACK");
  throw error;
}
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all();
for (const { name } of tables) console.log(`${name}: ${db.prepare(`SELECT COUNT(*) AS n FROM "${name}"`).get().n} rows`);
db.close();
console.log(`Saved ${dbPath}`);
