# CLAUDE.md

## What this project is
A Day 1 hackathon web app for a furniture shop's buyers. A logged-in user can:
1. Log in
2. Browse a product catalogue (furniture items with name, price, image)
3. Place orders while staying within a set budget (the app tracks running total vs. budget and prevents/warns on overspend)

## Who's building it
The owner has no coding background. Claude Code makes all technical decisions (stack, structure, implementation) and does all the building. Explanations should stay in plain English — avoid unexplained jargon.

## Status
2026-07-29: Scaffold built. Home page (real product catalogue), login/signup, and the database are working. Switched from Supabase to a local database (see below) at the owner's request.

## Tech stack
- **Next.js** — React-based framework that handles both the pages the user sees and the server-side logic (like checking a budget) in one project.
- **SQLite (local file database)** — the database is a single file (`data/app.db`) created automatically the first time the app runs. No account or cloud setup needed. Trade-off: it lives only on this computer — there's no built-in way for multiple people to share it or to see it from another device, unlike a hosted database.
- **Hand-rolled login** — since we're not using Supabase, login/signup is custom: passwords are hashed with `bcryptjs` and the logged-in session is stored in an encrypted cookie (`iron-session`). Functionally equivalent for Day 1 purposes, just built by us instead of provided.
- **Tailwind CSS** — utility classes for styling without writing custom CSS files.

## Core features (Day 1 scope)
1. Login/signup (email + password, hand-rolled auth backed by the local database)
2. Product catalogue page (reads furniture items from the database — loaded from a MongoDB source catalogue via `scripts/sync-catalog-from-mongo.mjs`)
3. Order flow: add items to a cart, show running total against the user's budget, block/warn if over budget, save the order

## Folder structure
```
my-furniture-buyer-app/
  app/
    login/page.tsx      # login/signup form
    login/actions.ts     # server actions: authenticate, logout
    page.tsx              # home page / product catalogue
  components/
    ProductCard.tsx
    HeaderAuth.tsx        # login/logout state in the header
  lib/
    db.ts                 # opens the local SQLite file, applies schema
    session.ts            # reads/writes the encrypted session cookie
    products.ts            # Product type
  db/
    schema.sql             # table definitions, applied automatically on startup
  scripts/
    sync-catalog-from-mongo.mjs   # one-off import from the MongoDB source catalogue
  data/
    app.db                 # the actual database file (not committed to git)
  CLAUDE.md
```

## Notes for future sessions
- Keep explanations non-technical when talking to the owner.
- Prefer the simplest working solution over "best practice" abstractions — this is a one-day hackathon build.
- The database schema lives in `db/schema.sql` and is applied automatically every time the app starts (`lib/db.ts`) — there is no manual migration step to remember.
