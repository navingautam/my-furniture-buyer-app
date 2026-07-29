# CLAUDE.md

## What this project is
A Day 1 hackathon web app for a furniture shop's buyers. A logged-in user can:
1. Log in
2. Browse a product catalogue (furniture items with name, price, image)
3. Place orders while staying within a set budget (the app tracks running total vs. budget and prevents/warns on overspend)

## Who's building it
The owner has no coding background. Claude Code makes all technical decisions (stack, structure, implementation) and does all the building. Explanations should stay in plain English — avoid unexplained jargon.

## Status
2026-07-29: Project kicked off. Tech stack and folder structure proposed (see below), scaffold not yet created.

## Tech stack (proposed)
- **Next.js** — React-based framework that handles both the pages the user sees and the server-side logic (like checking a budget) in one project.
- **Supabase** — hosted database (Postgres) that also provides ready-made login/authentication, so we don't hand-build password handling.
- **Tailwind CSS** — utility classes for styling without writing custom CSS files.

## Core features (Day 1 scope)
1. Login/signup (email + password via Supabase Auth)
2. Product catalogue page (reads furniture items from the database)
3. Order flow: add items to a cart, show running total against the user's budget, block/warn if over budget, save the order

## Folder structure (proposed)
```
my-furniture-buyer-app/
  app/                  # pages (login, catalogue, orders) - Next.js App Router
    login/
    catalogue/
    orders/
  components/           # reusable UI pieces (ProductCard, BudgetBar, etc.)
  lib/
    supabase.ts         # one shared connection to the database
  CLAUDE.md
```

## Notes for future sessions
- Keep explanations non-technical when talking to the owner.
- Prefer the simplest working solution over "best practice" abstractions — this is a one-day hackathon build.
