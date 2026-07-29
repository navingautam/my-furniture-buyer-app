import db from "@/lib/db";

// Used for the "total spent so far" figure on the order history page — the
// buyer's actual remaining balance is now sourced live from the shop's API
// (see lib/ledger-api.ts), not computed from local order totals.
export function getTotalSpent(profileId: string): number {
  const { spent } = db
    .prepare(
      "select coalesce(sum(total), 0) as spent from orders where profile_id = ?"
    )
    .get(profileId) as { spent: number };
  return spent;
}
