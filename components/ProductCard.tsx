import Link from "next/link";
import type { DisplayProduct } from "@/lib/products";
import ProductActions from "@/components/ProductActions";

export default function ProductCard({ product }: { product: DisplayProduct }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col">
      <Link href={`/product/${product.itemId}`}>
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
      </Link>
      <div className="p-4 flex flex-col gap-1">
        {product.category && (
          <p className="text-xs uppercase tracking-wide text-gray-400">
            {product.category}
          </p>
        )}
        <Link href={`/product/${product.itemId}`} className="hover:underline">
          <h3 className="font-semibold">{product.name}</h3>
        </Link>
        <p className="font-medium mt-2 mb-2">
          ${product.price.toLocaleString()}
        </p>

        <ProductActions product={product} />
      </div>
    </div>
  );
}
