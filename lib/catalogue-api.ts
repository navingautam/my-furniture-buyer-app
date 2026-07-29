import { apiKey, SHOP_API_BASE_URL } from "@/lib/env";

export class ProductNotFoundError extends Error {}

export type CatalogueProduct = {
  itemId: string;
  name: string;
  price: number;
  category: string | null;
  colours: string[] | null;
  width: number | null;
  height: number | null;
  depth: number | null;
};

export type ProductDetail = {
  itemId: string;
  name: string;
  price: number;
  category: string | null;
  width: number | null;
  height: number | null;
  depth: number | null;
  colours: string[] | null;
  link: string | null;
};

type SearchIndexItem = {
  item_id: string;
  product_name: string;
  price: number;
  category: string | null;
  colours: string[] | null;
  width: number | null;
  height: number | null;
  depth: number | null;
};

// Uses /catalogue/search-index rather than the plain /catalogue endpoint —
// it's the lightweight listing meant for browsing (no images), and is much
// faster per the Participant Guide.
export async function fetchCatalogueProducts(): Promise<CatalogueProduct[]> {
  const url = new URL("/catalogue/search-index", SHOP_API_BASE_URL);
  url.searchParams.set("limit", "1000");

  const res = await fetch(url, {
    headers: apiKey ? { "x-api-key": apiKey } : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `Catalogue API request failed: ${res.status} ${res.statusText}`
    );
  }

  const items = (await res.json()) as SearchIndexItem[];

  // Visible proof this is a live network call, not local/fake data — watch
  // the terminal running `npm run dev` and reload the home page.
  console.log(
    `[catalogue-api] fetched ${items.length} products from ${url} at ${new Date().toISOString()}`
  );

  return items.map((item) => ({
    itemId: item.item_id,
    name: item.product_name,
    price: item.price,
    category: item.category,
    colours: item.colours,
    width: item.width,
    height: item.height,
    depth: item.depth,
  }));
}

type ProductDetailResponse = {
  item_id: string;
  product_name: string;
  price: number;
  category: string | null;
  width: number | null;
  height: number | null;
  depth: number | null;
  colours: string[] | null;
  link: string | null;
};

// GET /catalogue/{item_id} — full detail for one product, used for the
// product detail page. The response also includes the image as base64, but
// we ignore that here and point <img> straight at productImageUrl() instead
// (see below) — much simpler than embedding a huge base64 string in the page.
export async function fetchProductDetail(
  itemId: string
): Promise<ProductDetail> {
  const url = new URL(`/catalogue/${itemId}`, SHOP_API_BASE_URL);

  const res = await fetch(url, {
    headers: apiKey ? { "x-api-key": apiKey } : undefined,
    cache: "no-store",
  });

  if (res.status === 404) {
    const body = await res
      .json()
      .catch(() => ({ detail: `No product with item_id '${itemId}'` }));
    throw new ProductNotFoundError(
      body.detail ?? `No product with item_id '${itemId}'`
    );
  }

  if (!res.ok) {
    throw new Error(
      `Catalogue API request failed: ${res.status} ${res.statusText}`
    );
  }

  const item = (await res.json()) as ProductDetailResponse;

  return {
    itemId: item.item_id,
    name: item.product_name,
    price: item.price,
    category: item.category,
    width: item.width,
    height: item.height,
    depth: item.depth,
    colours: item.colours,
    link: item.link,
  };
}

// GET /catalogue/{item_id}/image — raw image bytes, usable directly as an
// <img src>. No auth required (same as search-index).
export function productImageUrl(itemId: string): string {
  return new URL(`/catalogue/${itemId}/image`, SHOP_API_BASE_URL).toString();
}
