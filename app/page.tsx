import { redirect } from "next/navigation";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import type { DisplayProduct } from "@/lib/products";
import { fetchCatalogueProducts } from "@/lib/catalogue-api";
import ProductCard from "@/components/ProductCard";

const DISPLAY_LIMIT = 60;

export default async function HomePage() {
  const session = await getSession();
  if (!session.userId) {
    redirect("/login");
  }

  const catalogueProducts = await fetchCatalogueProducts();

  // The catalogue API's search-index is lightweight (no images), so join
  // against our own database — populated from the same source catalogue —
  // to get an image and the local id "Add to cart" needs for checkout.
  const localRows = db
    .prepare("select source_id, id, image_url from products where source_id is not null")
    .all() as { source_id: string; id: string; image_url: string | null }[];
  const localBySourceId = new Map(localRows.map((row) => [row.source_id, row]));

  const products: DisplayProduct[] = catalogueProducts
    .slice(0, DISPLAY_LIMIT)
    .map((item) => {
      const local = localBySourceId.get(item.itemId);
      return {
        itemId: item.itemId,
        cartProductId: local?.id ?? null,
        name: item.name,
        category: item.category,
        price: item.price,
        imageUrl: local?.image_url ?? null,
      };
    });

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Catalogue</h1>
      <p className="text-gray-500 mb-6">
        {`Showing ${products.length} of ${catalogueProducts.length} products from the shop's catalogue API.`}
      </p>

      {catalogueProducts.length === 0 && (
        <p className="text-gray-500">
          The catalogue API returned no products — check the API key in
          .env and try again.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <ProductCard key={product.itemId} product={product} />
        ))}
      </div>
    </div>
  );
}
