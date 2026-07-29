import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { fetchRealBalance } from "@/lib/ledger-api";
import CartClient from "@/components/CartClient";

export default async function CartPage() {
  const session = await getSession();
  if (!session.userId) {
    redirect("/login");
  }

  let remainingBalance: number;
  try {
    remainingBalance = await fetchRealBalance();
  } catch (err) {
    console.error("Failed to fetch real balance:", err);
    return (
      <div className="px-6 py-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold mb-6">Your cart</h1>
        <p className="text-red-600 text-sm border border-red-200 bg-red-50 rounded px-3 py-2">
          Couldn&apos;t reach the balance service, so checkout is unavailable
          right now. Try again in a moment.
        </p>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Your cart</h1>
      <CartClient remainingBalance={remainingBalance} />
    </div>
  );
}
