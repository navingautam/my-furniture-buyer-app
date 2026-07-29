import { apiKey, SHOP_API_BASE_URL } from "@/lib/env";

export type CatalogueProduct = {
  itemId: string;
  name: string;
  price: number;
  category: string | null;
};

type SearchIndexItem = {
  item_id: string;
  product_name: string;
  price: number;
  category: string | null;
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
  }));
}
