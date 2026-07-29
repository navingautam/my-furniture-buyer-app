"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { getRemainingBalance } from "@/lib/balance";

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

  // Always re-look-up current prices server-side — never trust totals
  // computed in the browser.
  const priceRows = db
    .prepare(
      `select id, price from products where id in (${lines.map(() => "?").join(",")})`
    )
    .all(...lines.map((l) => l.productId)) as { id: string; price: number }[];
  const priceById = new Map(priceRows.map((row) => [row.id, row.price]));

  let total = 0;
  for (const line of lines) {
    const price = priceById.get(line.productId);
    if (price === undefined) {
      return { error: "One of the items in your cart no longer exists." };
    }
    total += price * line.quantity;
  }

  const remaining = getRemainingBalance(userId);
  if (total > remaining) {
    return {
      error: `This order totals $${total.toLocaleString()}, which is $${(
        total - remaining
      ).toLocaleString()} more than your $${remaining.toLocaleString()} remaining balance. Remove some items to continue.`,
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
    insertOrder.run(orderId, userId, total);
    for (const line of lines) {
      insertItem.run(
        randomUUID(),
        orderId,
        line.productId,
        line.quantity,
        priceById.get(line.productId)
      );
    }
  });
  placeOrderTransaction();

  // The header (shared layout) shows remaining balance — without this,
  // Next's client-side router cache can keep showing the pre-order figure
  // for a while after redirecting.
  revalidatePath("/", "layout");

  return { success: true };
}
