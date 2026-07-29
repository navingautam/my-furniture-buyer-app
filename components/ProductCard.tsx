"use client";

import { useState } from "react";
import type { Product } from "@/lib/products";
import { useCart } from "@/lib/cart-context";

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col">
      {/* Plain <img>, not next/image: catalogue images come through as data
          URIs (embedded base64), which Next's image optimizer can't process. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={product.image_url ?? undefined}
        alt={product.name}
        className="w-full h-48 object-cover bg-gray-100"
      />
      <div className="p-4 flex flex-col gap-1">
        <h3 className="font-semibold">{product.name}</h3>
        {product.description && (
          <p className="text-sm text-gray-500">{product.description}</p>
        )}
        <p className="font-medium mt-2">${product.price.toLocaleString()}</p>
        <button
          onClick={() => {
            addItem({
              productId: product.id,
              name: product.name,
              price: product.price,
              imageUrl: product.image_url,
            });
            setAdded(true);
            setTimeout(() => setAdded(false), 1500);
          }}
          className="mt-2 border border-gray-300 rounded px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer"
        >
          {added ? "Added ✓" : "Add to cart"}
        </button>
      </div>
    </div>
  );
}
