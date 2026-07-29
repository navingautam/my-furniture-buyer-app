# Requirements

## Summary
A single-role web app for a furniture shop's buyers: log in, browse a catalogue, and place orders without exceeding a personal budget.

## User role
- **Buyer** — the only role for Day 1. No admin UI; products are added directly in the Supabase dashboard (a spreadsheet-like table), not through the app.

## Functional requirements

### FR1 — Authentication
- A buyer can sign up with email + password.
- A buyer can log in and log out.
- Catalogue and order pages are only visible when logged in.

### FR2 — Budget
- Each buyer has a budget (a number, e.g. $2,000), stored on their profile.
- Day 1: set once at signup with a default value; editing the budget later is a stretch goal, not required.

### FR3 — Product catalogue
- Buyer can view a list of furniture products: image, name, price, short description.
- Buyer can view a single product's detail page.
- Stretch goal: filter/search by name or category — not required for Day 1.

### FR4 — Cart & ordering
- Buyer can add a product to a cart and adjust quantity.
- The cart shows a running total and the buyer's remaining budget as items are added.
- If the cart total would exceed the buyer's remaining budget, checkout is blocked with a clear message — the buyer must remove items to proceed.
- On checkout, an order is created and the buyer's remaining budget is reduced by the order total.

### FR5 — Order history
- Buyer can view a list of their past orders with date, items, and total.

## Non-functional requirements
- **Speed of build over polish**: this is a one-day build. Prefer the simplest working approach.
- **Usable on a laptop browser** for the demo; mobile responsiveness is a nice-to-have, not required.
- **Basic security only**: rely on Supabase's built-in auth and access rules (row-level security) rather than custom security code.
- **No payment processing** — orders are recorded, not actually paid for.

## Explicitly out of scope for Day 1
- Payment integration (Stripe, etc.)
- Admin dashboard for managing products
- Multiple buyer roles / permissions
- Editing or cancelling a placed order
- Email notifications
