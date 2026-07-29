"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { placeOrder } from "@/app/cart/actions";

export default function CartClient({
  remainingBalance,
}: {
  remainingBalance: number;
}) {
  const { items, setQuantity, removeItem, clear, total } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const overBudget = total > remainingBalance;

  function handleCheckout() {
    setError(null);
    startTransition(async () => {
      const result = await placeOrder(
        items.map((i) => ({ productId: i.productId, quantity: i.quantity }))
      );
      if ("error" in result) {
        setError(result.error);
        return;
      }
      clear();
      router.push("/");
    });
  }

  if (items.length === 0) {
    return <p className="text-gray-500">Your cart is empty.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        {items.map((item) => (
          <div
            key={item.productId}
            className="flex items-center gap-4 border-b border-gray-200 pb-4"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.imageUrl ?? undefined}
              alt={item.name}
              className="w-16 h-16 object-cover rounded bg-gray-100"
            />
            <div className="flex-1">
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-gray-500">
                ${item.price.toLocaleString()} each
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantity(item.productId, item.quantity - 1)}
                className="border border-gray-300 rounded w-7 h-7 cursor-pointer"
                aria-label={`Decrease quantity of ${item.name}`}
              >
                -
              </button>
              <span className="w-6 text-center">{item.quantity}</span>
              <button
                onClick={() => setQuantity(item.productId, item.quantity + 1)}
                className="border border-gray-300 rounded w-7 h-7 cursor-pointer"
                aria-label={`Increase quantity of ${item.name}`}
              >
                +
              </button>
            </div>
            <p className="w-20 text-right font-medium">
              ${(item.price * item.quantity).toLocaleString()}
            </p>
            <button
              onClick={() => removeItem(item.productId)}
              className="text-sm text-gray-400 underline cursor-pointer"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <span>Cart total</span>
          <span className="font-medium">${total.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Remaining balance</span>
          <span className="font-medium">
            ${remainingBalance.toLocaleString()}
          </span>
        </div>
      </div>

      {overBudget && (
        <p className="text-red-600 text-sm border border-red-200 bg-red-50 rounded px-3 py-2">
          This order totals ${total.toLocaleString()}, which is $
          {(total - remainingBalance).toLocaleString()} more than your $
          {remainingBalance.toLocaleString()} remaining balance. Remove some
          items to check out.
        </p>
      )}
      {error && (
        <p className="text-red-600 text-sm border border-red-200 bg-red-50 rounded px-3 py-2">
          {error}
        </p>
      )}

      <button
        onClick={handleCheckout}
        disabled={overBudget || isPending}
        className="bg-black text-white rounded px-3 py-2 disabled:opacity-50 cursor-pointer"
      >
        {isPending ? "Placing order…" : "Check out"}
      </button>
    </div>
  );
}
