"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DisplayProduct } from "@/lib/products";
import { useCart } from "@/lib/cart-context";
import { buyNow } from "@/app/buy-now-actions";

export default function ProductCard({ product }: { product: DisplayProduct }) {
  const { addItem } = useCart();
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const [isBuying, startBuyTransition] = useTransition();
  const [buyResult, setBuyResult] = useState<
    | { status: "success"; orderId: string; totalPrice: number; remainingBalance: number }
    | { status: "error"; message: string }
    | null
  >(null);

  function handleBuy() {
    setBuyResult(null);
    startBuyTransition(async () => {
      let result;
      try {
        result = await buyNow(product.itemId, product.price);
      } catch (err) {
        console.error("Buy request failed:", err);
        setBuyResult({
          status: "error",
          message: "Couldn't place the order right now — try again in a moment.",
        });
        return;
      }
      if ("error" in result) {
        setBuyResult({ status: "error", message: result.error });
        return;
      }
      setBuyResult({
        status: "success",
        orderId: result.orderId,
        totalPrice: result.totalPrice,
        remainingBalance: result.remainingBalance,
      });
      router.refresh();
    });
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col">
      {product.imageUrl ? (
        // Plain <img>, not next/image: catalogue images come through as data
        // URIs (embedded base64), which Next's image optimizer can't process.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-48 object-cover bg-gray-100"
        />
      ) : (
        <div className="w-full h-48 bg-gray-100 flex items-center justify-center text-sm text-gray-400">
          No image
        </div>
      )}
      <div className="p-4 flex flex-col gap-1">
        {product.category && (
          <p className="text-xs uppercase tracking-wide text-gray-400">
            {product.category}
          </p>
        )}
        <h3 className="font-semibold">{product.name}</h3>
        <p className="font-medium mt-2">${product.price.toLocaleString()}</p>

        <div className="flex gap-2 mt-2">
          <button
            onClick={() => {
              if (!product.cartProductId) return;
              addItem({
                productId: product.cartProductId,
                name: product.name,
                price: product.price,
                imageUrl: product.imageUrl,
              });
              setAdded(true);
              setTimeout(() => setAdded(false), 1500);
            }}
            disabled={!product.cartProductId}
            title={
              product.cartProductId
                ? undefined
                : "This item isn't available to order yet"
            }
            className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {added ? "Added ✓" : "Add to cart"}
          </button>
          <button
            onClick={handleBuy}
            disabled={isBuying}
            className="flex-1 bg-black text-white rounded px-3 py-1.5 text-sm hover:bg-gray-800 disabled:opacity-50 cursor-pointer"
          >
            {isBuying ? "Buying…" : "Buy"}
          </button>
        </div>

        {buyResult?.status === "success" && (
          <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1.5 mt-2">
            Order placed (#{buyResult.orderId.slice(0, 8)}) — $
            {buyResult.totalPrice.toLocaleString()} charged. New balance: $
            {buyResult.remainingBalance.toLocaleString()}.
          </p>
        )}
        {buyResult?.status === "error" && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5 mt-2">
            {buyResult.message}
          </p>
        )}
      </div>
    </div>
  );
}
