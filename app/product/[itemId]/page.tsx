import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import db from "@/lib/db";
import {
  fetchProductDetail,
  productImageUrl,
  ProductNotFoundError,
} from "@/lib/catalogue-api";
import ProductActions from "@/components/ProductActions";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;

  const session = await getSession();
  if (!session.userId) {
    redirect("/login");
  }

  let product;
  try {
    product = await fetchProductDetail(itemId);
  } catch (err) {
    if (err instanceof ProductNotFoundError) {
      return (
        <div className="px-6 py-8 max-w-2xl mx-auto">
          <p className="text-gray-500">This item is no longer available.</p>
          <Link href="/" className="text-sm underline">
            Back to catalogue
          </Link>
        </div>
      );
    }
    console.error("Failed to fetch product detail:", err);
    return (
      <div className="px-6 py-8 max-w-2xl mx-auto">
        <p className="text-red-600 text-sm border border-red-200 bg-red-50 rounded px-3 py-2">
          Couldn&apos;t load this product right now — try again in a moment.
        </p>
        <Link href="/" className="text-sm underline mt-4 inline-block">
          Back to catalogue
        </Link>
      </div>
    );
  }

  const localProduct = db
    .prepare("select id, image_url from products where source_id = ?")
    .get(itemId) as { id: string; image_url: string | null } | undefined;

  const dimensions = [product.width, product.height, product.depth]
    .filter((n): n is number => typeof n === "number")
    .join(" x ");

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <Link href="/" className="text-sm underline">
        ← Back to catalogue
      </Link>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={productImageUrl(product.itemId)}
          alt={product.name}
          className="w-full rounded-lg bg-gray-100 object-cover"
        />

        <div className="flex flex-col gap-2">
          {product.category && (
            <p className="text-xs uppercase tracking-wide text-gray-400">
              {product.category}
            </p>
          )}
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          <p className="text-xl font-medium">
            ${product.price.toLocaleString()}
          </p>

          <dl className="text-sm text-gray-600 mt-2 flex flex-col gap-1">
            {dimensions && (
              <div className="flex gap-2">
                <dt className="text-gray-400">Dimensions (W x H x D, cm)</dt>
                <dd>{dimensions}</dd>
              </div>
            )}
            {product.colours && product.colours.length > 0 && (
              <div className="flex gap-2">
                <dt className="text-gray-400">Colours</dt>
                <dd>{product.colours.join(", ")}</dd>
              </div>
            )}
          </dl>

          {product.link && (
            <a
              href={product.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline text-gray-500 mt-1"
            >
              View on original IKEA listing
            </a>
          )}

          <div className="mt-4">
            <ProductActions
              product={{
                itemId: product.itemId,
                cartProductId: localProduct?.id ?? null,
                name: product.name,
                price: product.price,
                imageUrl: localProduct?.image_url ?? null,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
