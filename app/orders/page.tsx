import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getOrdersForProfile, reconcileMissingShopOrderIds } from "@/lib/orders";
import { getTotalSpent } from "@/lib/balance";

// SQLite's datetime('now') returns "YYYY-MM-DD HH:MM:SS" (UTC, no timezone
// marker) — reformat to ISO 8601 so Date parsing is reliable everywhere.
function formatOrderDate(sqliteTimestamp: string) {
  return new Date(sqliteTimestamp.replace(" ", "T") + "Z").toLocaleString();
}

export default async function OrdersPage() {
  const session = await getSession();
  if (!session.userId) {
    redirect("/login");
  }

  await reconcileMissingShopOrderIds();
  const orders = getOrdersForProfile(session.userId);
  const totalSpent = getTotalSpent(session.userId);

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Your orders</h1>
      <p className="text-gray-500 mb-6">
        Total spent so far:{" "}
        <span className="font-medium text-black">
          ${totalSpent.toLocaleString()}
        </span>
      </p>

      {orders.length === 0 && (
        <p className="text-gray-500">You haven&apos;t placed any orders yet.</p>
      )}

      <div className="flex flex-col gap-6">
        {orders.map((order) => (
          <div
            key={order.id}
            className="border border-gray-200 rounded-lg p-4"
          >
            <div className="flex justify-between items-baseline mb-3">
              <span className="text-sm text-gray-500">
                {formatOrderDate(order.createdAt)}
              </span>
              <span className="font-semibold">
                ${order.total.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {order.items.map((item) => {
                const content = (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl ?? undefined}
                      alt={item.name}
                      className="w-10 h-10 object-cover rounded bg-gray-100"
                    />
                    <span className="flex-1">{item.name}</span>
                    <span className="text-gray-500">x{item.quantity}</span>
                    <span className="w-16 text-right">
                      ${(item.priceAtPurchase * item.quantity).toLocaleString()}
                    </span>
                  </>
                );
                return item.itemId ? (
                  <Link
                    key={item.productId}
                    href={`/product/${item.itemId}`}
                    className="flex items-center gap-3 text-sm hover:bg-gray-50 rounded px-1 -mx-1"
                  >
                    {content}
                  </Link>
                ) : (
                  <div key={item.productId} className="flex items-center gap-3 text-sm">
                    {content}
                  </div>
                );
              })}
            </div>
            {order.shopOrderId ? (
              <a
                href={`/invoices/${order.shopOrderId}`}
                className="text-sm underline text-gray-500 mt-3 inline-block"
              >
                Download invoice
              </a>
            ) : (
              <p className="text-sm text-gray-400 mt-3">
                Invoice not available for this order.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
