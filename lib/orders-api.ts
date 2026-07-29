import { apiKey, participantUserId, SHOP_API_BASE_URL } from "@/lib/env";

export class InsufficientBalanceError extends Error {}
export class ItemNotFoundError extends Error {}

export type PlacedOrderLine = {
  itemId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type PlacedOrder = {
  orderId: string;
  totalPrice: number;
  remainingBalance: number;
  items: PlacedOrderLine[];
};

type OrderResponse = {
  order_id: string;
  user_id: string;
  total_price: number;
  remaining_balance: number;
  items: {
    item_id: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }[];
};

// POST /orders — per the shop's API docs, "this is also the payment -- it
// debits the balance." Real money-like effect: this actually reduces the
// balance shown elsewhere in the app, unlike our own local order history.
// Supports one or more line items in a single real order/charge.
export async function placeRealOrderMulti(
  items: { itemId: string; quantity: number }[],
  idempotencyKey: string
): Promise<PlacedOrder> {
  if (!participantUserId) {
    throw new Error("PARTICIPANT_USER_ID is not set in .env");
  }

  const url = new URL("/orders", SHOP_API_BASE_URL);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "x-api-key": apiKey } : {}),
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      user_id: participantUserId,
      items: items.map((i) => ({ item_id: i.itemId, quantity: i.quantity })),
    }),
    cache: "no-store",
  });

  if (res.status === 402) {
    const body = await res
      .json()
      .catch(() => ({ detail: "Insufficient balance." }));
    throw new InsufficientBalanceError(body.detail ?? "Insufficient balance.");
  }

  if (res.status === 404) {
    const fallback = `No product with item_id '${items.map((i) => i.itemId).join(", ")}'`;
    const body = await res.json().catch(() => ({ detail: fallback }));
    throw new ItemNotFoundError(body.detail ?? fallback);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { detail?: string });
    throw new Error(
      body.detail ?? `Order request failed: ${res.status} ${res.statusText}`
    );
  }

  const data = (await res.json()) as OrderResponse;

  return {
    orderId: data.order_id,
    totalPrice: data.total_price,
    remainingBalance: data.remaining_balance,
    items: data.items.map((item) => ({
      itemId: item.item_id,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      lineTotal: item.line_total,
    })),
  };
}

// Convenience wrapper for the common single-item case (Buy button, agent).
export async function placeRealOrder(
  itemId: string,
  quantity: number,
  idempotencyKey: string
): Promise<PlacedOrder> {
  return placeRealOrderMulti([{ itemId, quantity }], idempotencyKey);
}
