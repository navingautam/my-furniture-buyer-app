import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getRemainingBalance } from "@/lib/balance";
import CartClient from "@/components/CartClient";

export default async function CartPage() {
  const session = await getSession();
  if (!session.userId) {
    redirect("/login");
  }

  const remainingBalance = getRemainingBalance(session.userId);

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Your cart</h1>
      <CartClient remainingBalance={remainingBalance} />
    </div>
  );
}
