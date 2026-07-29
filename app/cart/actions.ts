"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import {
  placeRealOrderMulti,
  InsufficientBalanceError,
  ItemNotFoundError,
} from "@/lib/orders-api";

export type CheckoutLine = { productId: string; quantity: number };
export type CheckoutResult = { error: string } | { success: true };

export async function placeOrder(
  lines: CheckoutLine[]
): Promise<CheckoutResult> {
  const session = await getSession();
  const userId = session.userId;
  if (!userId) {
    return { error: "You need to be logged in to place an order." };
  }
  if (lines.length === 0) {
    return { error: "Your cart is empty." };
  }

  // Cart items are keyed by our local product id — map each to the shop
  // catalogue's item_id (source_id) so we can place a REAL order that
  // actually debits the balance, not just a local record.
  const rows = db
    .prepare(
      `select id, source_id from products where id in (${lines.map(() => "?").join(",")})`
    )
    .all(...lines.map((l) => l.productId)) as {
    id: string;
    source_id: string | null;
  }[];
  const sourceIdByProductId = new Map(rows.map((r) => [r.id, r.source_id]));

  for (const line of lines) {
    if (!sourceIdByProductId.get(line.productId)) {
      return { error: "One of the items in your cart no longer exists." };
    }
  }

  let order;
  try {
    order = await placeRealOrderMulti(
      lines.map((line) => ({
        itemId: sourceIdByProductId.get(line.productId)!,
        quantity: line.quantity,
      })),
      randomUUID()
    );
  } catch (err) {
    if (err instanceof InsufficientBalanceError) {
      return {
        error: `Insufficient balance to complete this purchase (${err.message}).`,
      };
    }
    if (err instanceof ItemNotFoundError) {
      return { error: "One of the items in your cart no longer exists." };
    }
    console.error("Failed to place real order:", err);
    return {
      error: "Couldn't place the order right now — try again in a moment.",
    };
  }

  const orderId = randomUUID();
  const insertOrder = db.prepare(
    "insert into orders (id, profile_id, total) values (?, ?, ?)"
  );
  const insertItem = db.prepare(
    "insert into order_items (id, order_id, product_id, quantity, price_at_purchase) values (?, ?, ?, ?, ?)"
  );

  const placeOrderTransaction = db.transaction(() => {
    insertOrder.run(orderId, userId, order.totalPrice);
    for (const line of lines) {
      insertItem.run(
        randomUUID(),
        orderId,
        line.productId,
        line.quantity,
        order.items.find((i) => i.itemId === sourceIdByProductId.get(line.productId))
          ?.unitPrice ?? 0
      );
    }
  });
  placeOrderTransaction();

  // The header (shared layout) shows remaining balance — without this,
  // Next's client-side router cache can keep showing the pre-order figure
  // for a while after redirecting.
  revalidatePath("/", "layout");
  revalidatePath("/orders");

  return { success: true };
}
