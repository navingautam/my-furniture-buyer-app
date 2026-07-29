import db from "@/lib/db";

export type OrderItemView = {
  productId: string;
  name: string;
  imageUrl: string | null;
  quantity: number;
  priceAtPurchase: number;
};

export type OrderView = {
  id: string;
  total: number;
  createdAt: string;
  items: OrderItemView[];
};

export function getOrdersForProfile(profileId: string): OrderView[] {
  const orders = db
    .prepare(
      "select id, total, created_at as createdAt from orders where profile_id = ? order by created_at desc"
    )
    .all(profileId) as { id: string; total: number; createdAt: string }[];

  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const items = db
    .prepare(
      `select oi.order_id as orderId, oi.product_id as productId, oi.quantity,
              oi.price_at_purchase as priceAtPurchase, p.name, p.image_url as imageUrl
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
