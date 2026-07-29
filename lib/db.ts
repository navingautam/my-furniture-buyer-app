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
// `db` was opened before this column existed in schema.sql, and
// `create table if not exists` never retroactively adds columns to an
// already-existing table. If this still errors after saving, restart the
// dev server (module caching aside, the process itself needs to pick this up).
const orderColumns = db.prepare("pragma table_info(orders)").all() as {
  name: string;
}[];
if (!orderColumns.some((c) => c.name === "shop_order_id")) {
  db.exec("alter table orders add column shop_order_id text");
}

export default db;
