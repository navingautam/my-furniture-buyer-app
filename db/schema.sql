-- Local SQLite database schema. Applied automatically on startup (see
-- lib/db.ts) — there's nothing to run by hand, unlike a hosted database.
-- Mirrors the data model in architecture.md: profiles, products, orders,
-- order_items. No separate login system here, so profiles also holds the
-- password hash.

create table if not exists profiles (
  id text primary key,
  email text not null unique,
  password_hash text not null,
  -- Starting balance, fixed at signup. How much is left is computed by
  -- subtracting the total of this buyer's past orders (see lib/balance.ts) —
  -- not stored here, so there's nothing to keep in sync.
  budget numeric not null default 2000,
  created_at text not null default (datetime('now'))
);

create table if not exists products (
  id text primary key,
  name text not null,
  description text,
  price numeric not null,
  image_url text,
  category text,
  -- id of the item in an external catalogue (e.g. the Mongo import), so
  -- re-running the sync updates existing rows instead of duplicating them.
  source_id text unique,
  created_at text not null default (datetime('now'))
);

create table if not exists orders (
  id text primary key,
  profile_id text not null references profiles (id) on delete cascade,
  total numeric not null,
  created_at text not null default (datetime('now')),
  -- The shop API's own order_id (from POST /orders) — needed to fetch that
  -- order's invoice PDF. Null for older local-only orders placed before
  -- checkout called the real API.
  shop_order_id text
);

create table if not exists order_items (
  id text primary key,
  order_id text not null references orders (id) on delete cascade,
  product_id text not null references products (id),
  quantity integer not null,
  price_at_purchase numeric not null
);
