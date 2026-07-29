# Architecture

## Overview
```
Browser  <-->  Next.js app  <-->  Supabase (Postgres database + Auth)
```
Next.js serves the pages and also talks to Supabase to read products, check the buyer's budget, and save orders. There is no separate backend server to manage — Supabase acts as the database and the login system.

## Data model (Supabase / Postgres tables)

**profiles** (one row per buyer, linked to Supabase's built-in auth user)
| column | type | notes |
|---|---|---|
| id | uuid | matches the auth user id |
| email | text | |
| budget | numeric | remaining budget, starts at a default value |

**products**
| column | type | notes |
|---|---|---|
| id | uuid | |
| name | text | |
| description | text | |
| price | numeric | |
| image_url | text | |

**orders**
| column | type | notes |
|---|---|---|
| id | uuid | |
| profile_id | uuid | which buyer placed it |
| total | numeric | |
| created_at | timestamp | |

**order_items**
| column | type | notes |
|---|---|---|
| id | uuid | |
| order_id | uuid | |
| product_id | uuid | |
| quantity | integer | |
| price_at_purchase | numeric | so later price changes don't rewrite history |

Access rule (Supabase row-level security): a buyer can only read/write their own `profiles`, `orders`, and `order_items` rows. `products` are readable by any logged-in buyer.

## Pages (Next.js App Router)
| route | purpose |
|---|---|
| `/login` | sign up / log in |
| `/catalogue` | list all products |
| `/catalogue/[id]` | single product detail |
| `/cart` | current cart, running total vs. budget, checkout |
| `/orders` | past orders for the logged-in buyer |

## Key flows

**Login**
1. Buyer submits email/password on `/login`.
2. Supabase Auth verifies and returns a session.
3. Next.js stores the session and redirects to `/catalogue`.

**Browsing**
1. `/catalogue` loads and asks Supabase for all rows in `products`.
2. Each product renders as a card (image, name, price).

**Checkout with budget check**
1. Buyer adds products to the cart (kept in local app state, not the database, until checkout).
2. Cart page computes: `cart total` vs. `profiles.budget` for the logged-in buyer.
3. If `cart total > budget`: show a warning, disable the checkout button.
4. If within budget: on confirm, create one `orders` row and one `order_items` row per product, then subtract the total from `profiles.budget`.

## Folder structure
```
my-furniture-buyer-app/
  app/
    login/page.tsx
    catalogue/page.tsx
    catalogue/[id]/page.tsx
    cart/page.tsx
    orders/page.tsx
  components/
    ProductCard.tsx
    BudgetBar.tsx
  lib/
    supabase.ts        # shared Supabase client
  requirements.md
  architecture.md
  CLAUDE.md
```

## Environment & deployment
- Supabase project URL and public key are stored in `.env.local` (never committed to git).
- Deployment target: Vercel (free tier), connected to the same `.env` values, for demoing a live link.
