import Link from "next/link";
import { productImageUrl } from "@/lib/catalogue-api";
import type { SearchCatalogueItem } from "@/lib/agent-tools";

// Compact version of ProductCard for search_catalogue results shown inline
// in the chat — smaller image, item id shown, and a "Buy" button that just
// sends a chat message naming the item id — it does NOT purchase directly.
// That message goes through the normal agent turn (get_product/propose_purchase),
// so the same propose → Confirm & buy safety flow still applies. Uses the
// shop's direct image endpoint (see lib/catalogue-api.ts's productImageUrl)
// since search_catalogue itself never returns image data to the model.
export default function AgentProductGrid({
  items,
  onBuyClick,
  disabled,
}: {
  items: SearchCatalogueItem[];
  onBuyClick: (item: SearchCatalogueItem) => void;
  disabled?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {items.map((item) => (
        <div
          key={item.itemId}
          className="border border-gray-200 rounded-lg overflow-hidden flex flex-col"
        >
          <Link href={`/product/${item.itemId}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={productImageUrl(item.itemId)}
              alt={item.name}
              className="w-full h-20 object-cover bg-gray-100"
            />
          </Link>
          <div className="p-2 flex flex-col gap-0.5">
            {item.category && (
              <p className="text-[10px] uppercase tracking-wide text-gray-400 truncate">
                {item.category}
              </p>
            )}
            <Link href={`/product/${item.itemId}`} className="hover:underline">
              <p className="text-xs font-medium truncate">{item.name}</p>
            </Link>
            <p className="text-[10px] text-gray-400 truncate">ID: {item.itemId}</p>
            <p className="text-xs text-gray-600">${item.price.toLocaleString()}</p>
            <button
              onClick={() => onBuyClick(item)}
              disabled={disabled}
              className="mt-1 border border-gray-300 rounded px-2 py-1 text-[11px] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Buy
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
