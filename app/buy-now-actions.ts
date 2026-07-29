"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import {
  placeRealOrder,
  InsufficientBalanceError,
  ItemNotFoundError,
} from "@/lib/orders-api";

export type BuyNowResult =
  | { error: string }
  | {
      success: true;
      orderId: string;
      totalPrice: number;
      remainingBalance: number;
    };

export async function buyNow(
  itemId: string,
  unitPrice: number,
  quantity: number = 1
): Promise<BuyNowResult> {
  const session = await getSession();
  if (!session.userId) {
    return { error: "You need to be logged in to buy." };
  }

  let order;
  try {
    order = await placeRealOrder(itemId, quantity, randomUUID());
  } catch (err) {
    if (err instanceof InsufficientBalanceError) {
      return {
        error: `Insufficient balance to complete this purchase (${err.message}).`,
      };
    }
    if (err instanceof ItemNotFoundError) {
      return { error: "This item is no longer available." };
    }
    console.error("Failed to place real order:", err);
    return {
      error: "Couldn't place the order right now — try again in a moment.",
    };
  }

  // Best-effort: mirror into our own order history so it shows up on
  // /orders alongside cart checkouts. The real purchase already succeeded
  // above regardless of whether this local bookkeeping finds or records a
  // match — a local hiccup here must never look like the purchase failed.
  try {
    const localProduct = db
      .prepare("select id from products where source_id = ?")
      .get(itemId) as { id: string } | undefined;

    if (localProduct) {
      const localOrderId = randomUUID();
      db.prepare(
        "insert into orders (id, profile_id, total, shop_order_id) values (?, ?, ?, ?)"
      ).run(localOrderId, session.userId, order.totalPrice, order.orderId);
      db.prepare(
        "insert into order_items (id, order_id, product_id, quantity, price_at_purchase) values (?, ?, ?, ?, ?)"
      ).run(randomUUID(), localOrderId, localProduct.id, quantity, unitPrice);
    }
  } catch (err) {
    console.error("Failed to mirror real order into local history:", err);
  }

  // Refresh the header's balance and the order history page.
  revalidatePath("/", "layout");
  revalidatePath("/orders");

  return {
    success: true,
    orderId: order.orderId,
    totalPrice: order.totalPrice,
    remainingBalance: order.remainingBalance,
  };
}
