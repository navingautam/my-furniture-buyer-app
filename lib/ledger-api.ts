import { apiKey, participantUserId, SHOP_API_BASE_URL } from "@/lib/env";

// GET /users/{user_id} — "Account & Balance" in the shop's API. Per its own
// description, the balance is derived by summing ledger credits/debits on
// their side; it isn't something we store. This is a single account tied to
// the API key (see lib/env.ts), so every buyer in this app sees the same
// figure — it isn't debited by orders placed through our own checkout.
export async function fetchRealBalance(): Promise<number> {
  if (!participantUserId) {
    throw new Error("PARTICIPANT_USER_ID is not set in .env");
  }

  const url = new URL(`/users/${participantUserId}`, SHOP_API_BASE_URL);

  const res = await fetch(url, {
    headers: apiKey ? { "x-api-key": apiKey } : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Balance request failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { balance: number };
  return data.balance;
}
