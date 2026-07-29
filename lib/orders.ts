import db from "@/lib/db";
import { fetchOrderHistory, type ShopOrderRecord } from "@/lib/orders-api";

export type OrderItemView = {
  productId: string;
  itemId: string | null;
  name: string;
  imageUrl: string | null;
  quantity: number;
  priceAtPurchase: number;
};

export type OrderView = {
  id: string;
  total: number;
  createdAt: string;
  shopOrderId: string | null;
  items: OrderItemView[];
};

export function getOrdersForProfile(profileId: string): OrderView[] {
  const orders = db
    .prepare(
      "select id, total, created_at as createdAt, shop_order_id as shopOrderId from orders where profile_id = ? order by created_at desc"
    )
    .all(profileId) as {
    id: string;
    total: number;
    createdAt: string;
    shopOrderId: string | null;
  }[];

  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const items = db
    .prepare(
      `select oi.order_id as orderId, oi.product_id as productId, oi.quantity,
              oi.price_at_purchase as priceAtPurchase, p.name, p.image_url as imageUrl,
              p.source_id as itemId
       from order_items oi
       join products p on p.id = oi.product_id
       where oi.order_id in (${orderIds.map(() => "?").join(",")})`
    )
    .all(...orderIds) as (OrderItemView & { orderId: string })[];

  const itemsByOrder = new Map<string, OrderItemView[]>();
  for (const { orderId, ...item } of items) {
    if (!itemsByOrder.has(orderId)) itemsByOrder.set(orderId, []);
    itemsByOrder.get(orderId)!.push(item);
  }

  return orders.map((order) => ({
    ...order,
    items: itemsByOrder.get(order.id) ?? [],
  }));
}

// Best-effort backfill for orders placed before `shop_order_id` existed (or
// during the window where the column migration hadn't run yet) — matches
// each local order missing one against the shop's real order history by
// total amount + closest timestamp, so every real order still gets a
// working invoice link. Safe to call repeatedly; a no-op once nothing's
// missing, and never throws (a reachability hiccup just means try later).
export async function reconcileMissingShopOrderIds(): Promise<void> {
  const missing = db
    .prepare(
      "select id, total, created_at as createdAt from orders where shop_order_id is null"
    )
    .all() as { id: string; total: number; createdAt: string }[];
  if (missing.length === 0) return;

  let history: ShopOrderRecord[];
  try {
    history = await fetchOrderHistory();
  } catch (err) {
    console.error("Failed to fetch shop order history for reconciliation:", err);
    return;
  }

  const alreadyUsed = new Set(
    (
      db
        .prepare(
          "select shop_order_id as id from orders where shop_order_id is not null"
        )
        .all() as { id: string }[]
    ).map((r) => r.id)
  );

  const update = db.prepare("update orders set shop_order_id = ? where id = ?");

  for (const order of missing) {
    const localTime = new Date(
      order.createdAt.replace(" ", "T") + "Z"
    ).getTime();

    const candidates = history.filter(
      (h) => !alreadyUsed.has(h.orderId) && Math.abs(h.totalAmount - order.total) < 0.01
    );
    if (candidates.length === 0) continue;

    candidates.sort((a, b) => {
      const aDiff = a.timestamp
        ? Math.abs(new Date(a.timestamp).getTime() - localTime)
        : Infinity;
      const bDiff = b.timestamp
        ? Math.abs(new Date(b.timestamp).getTime() - localTime)
        : Infinity;
      return aDiff - bDiff;
    });

    const match = candidates[0];
    update.run(match.orderId, order.id);
    alreadyUsed.add(match.orderId);
  }
}
