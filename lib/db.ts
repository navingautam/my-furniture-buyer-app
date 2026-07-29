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

export default db;
