import { redirect } from "next/navigation";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import type { Product } from "@/lib/products";
import ProductCard from "@/components/ProductCard";

const DISPLAY_LIMIT = 60;

export default async function HomePage() {
  const session = await getSession();
  if (!session.userId) {
    redirect("/login");
  }

  const { count } = db
    .prepare("select count(*) as count from products")
    .get() as { count: number };

  const products = db
    .prepare(
      "select id, name, description, price, image_url from products order by created_at asc limit ?"
    )
    .all(DISPLAY_LIMIT) as Product[];

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Catalogue</h1>
      <p className="text-gray-500 mb-6">
        {count
          ? `Showing ${Math.min(DISPLAY_LIMIT, count)} of ${count} products.`
          : "Products come from the local database."}
      </p>

      {products.length === 0 && (
        <p className="text-gray-500">
          No products yet — run{" "}
          <code className="bg-gray-100 px-1 rounded">
            node scripts/sync-catalog-from-mongo.mjs
          </code>{" "}
          to load the catalogue.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
