import db from "@/lib/db";

export function getTotalSpent(profileId: string): number {
  const { spent } = db
    .prepare(
      "select coalesce(sum(total), 0) as spent from orders where profile_id = ?"
    )
    .get(profileId) as { spent: number };
  return spent;
}

// `profiles.budget` is the starting balance given at signup and never
// changes. How much a buyer has left is always computed from it minus
// everything they've ordered so far — nothing to keep in sync by hand.
export function getRemainingBalance(profileId: string): number {
  const profile = db
    .prepare("select budget from profiles where id = ?")
    .get(profileId) as { budget: number } | undefined;

  if (!profile) {
    throw new Error(`No profile found for id ${profileId}`);
  }

  return profile.budget - getTotalSpent(profileId);
}
