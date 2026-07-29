import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

declare global {
  var __db: Database.Database | undefined;
}

function createConnection() {
  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });

  const db = new Database(path.join(dataDir, "app.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(fs.readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8"));
  return db;
}

// Cache the connection on `global` so Next.js dev's hot-reload doesn't open
// a new one on every file save (SQLite doesn't like many open connections).
const db = globalThis.__db ?? createConnection();
if (process.env.NODE_ENV !== "production") globalThis.__db = db;

// Runs on every module load, even against a cached connection — a cached
// `db` was opened before these columns existed in schema.sql, and
// `create table if not exists` never retroactively adds columns to an
// already-existing table. If this still errors after saving, restart the
// dev server (module caching aside, the process itself needs to pick this up).
function ensureColumn(table: string, column: string, ddlType: string) {
  const columns = db.prepare(`pragma table_info(${table})`).all() as {
    name: string;
  }[];
  if (!columns.some((c) => c.name === column)) {
    db.exec(`alter table ${table} add column ${column} ${ddlType}`);
  }
}

ensureColumn("orders", "shop_order_id", "text");
ensureColumn("products", "width", "numeric");
ensureColumn("products", "height", "numeric");
ensureColumn("products", "depth", "numeric");

export default db;
