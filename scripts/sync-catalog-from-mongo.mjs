// One-off import: reads the furniture catalogue from the MongoDB database
// and loads it into the local SQLite `products` table, replacing the
// placeholder products. Safe to re-run — it upserts by `source_id` (the
// Mongo item_id), so running it again just refreshes the data instead of
// duplicating it.
//
// Requires MONGODB_URI in .env.local.
// Run with: node scripts/sync-catalog-from-mongo.mjs

import { MongoClient } from "mongodb";
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Minimal .env.local loader so this plain Node script sees the same
// variables the Next.js app does, without adding a dependency.
function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
}

function openDb() {
  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(path.join(dataDir, "app.db"));
  db.pragma("journal_mode = WAL");
  db.exec(
    fs.readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8")
  );
  return db;
}

function toDescription(doc) {
  const dims = [doc.width, doc.height, doc.depth]
    .filter((n) => typeof n === "number")
    .join(" x ");
  const colours = (doc.colours || []).join(", ");
  return [doc.category, colours, dims && `${dims} cm`]
    .filter(Boolean)
    .join(" · ");
}

async function main() {
  loadEnvLocal();
  const mongoUri = requireEnv("MONGODB_URI");

  const mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();
  const catalogCollection = mongoClient.db().collection("catalog");
  const docs = await catalogCollection.find({}).toArray();
  console.log(`Fetched ${docs.length} products from MongoDB.`);
  await mongoClient.close();

  const db = openDb();
  const upsert = db.prepare(`
    insert into products (id, source_id, name, description, price, category, image_url)
    values (@id, @source_id, @name, @description, @price, @category, @image_url)
    on conflict (source_id) do update set
      name = excluded.name,
      description = excluded.description,
      price = excluded.price,
      category = excluded.category,
      image_url = excluded.image_url
  `);

  const upsertAll = db.transaction((rows) => {
    for (const row of rows) upsert.run(row);
  });

  const rows = docs.map((doc) => ({
    id: randomUUID(),
    source_id: doc.item_id,
    name: doc.product_name,
    description: toDescription(doc),
    price: doc.price,
    category: doc.category,
    image_url: doc.image_url
      ? `data:${doc.image_mime_type || "image/jpeg"};base64,${doc.image_url}`
      : null,
  }));

  upsertAll(rows);
  console.log(`Upserted ${rows.length} products into the local database.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
