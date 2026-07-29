import { getSession } from "@/lib/session";
import db from "@/lib/db";
import { apiKey, SHOP_API_BASE_URL } from "@/lib/env";

// Proxies GET /orders/{order_id}/invoice from the shop API — that endpoint
// requires our API key, which a browser can't attach to a plain link, so we
// fetch it server-side and stream the PDF back. Ownership is checked against
// our local orders table (a buyer can only fetch their own invoices).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shopOrderId: string }> }
) {
  const { shopOrderId } = await params;

  const session = await getSession();
  if (!session.userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const owns = db
    .prepare("select 1 from orders where shop_order_id = ? and profile_id = ?")
    .get(shopOrderId, session.userId);
  if (!owns) {
    return new Response("Invoice not found.", { status: 404 });
  }

  const url = new URL(`/orders/${shopOrderId}/invoice`, SHOP_API_BASE_URL);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: apiKey ? { "x-api-key": apiKey } : undefined,
      cache: "no-store",
    });
  } catch (err) {
    console.error("Failed to fetch invoice:", err);
    return new Response("Couldn't reach the invoice service right now.", {
      status: 502,
    });
  }

  if (!res.ok || !res.body) {
    return new Response("Couldn't fetch the invoice right now.", {
      status: 502,
    });
  }

  return new Response(res.body, {
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${shopOrderId}.pdf"`,
    },
  });
}
