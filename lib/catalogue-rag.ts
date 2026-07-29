import db from "@/lib/db";

// Local, offline retrieval over the products table — populated from the
// full catalogue export (762 products with name/category/price/dimensions),
// the same underlying data as the shop's Mongo-backed catalogue, just kept
// on disk instead of fetched live. Used by the chat agent's search_catalogue
// tool so search doesn't depend on the shop API's latency (previously
// 3-8s per call) or its exact-match-only category filter.
//
// Trade-off: this local data has no colour field (the live shop API does),
// so colour filtering isn't available here — width/height/depth are, though,
// which the live API's search-index never exposed.
export type LocalCatalogueItem = {
  itemId: string;
  name: string;
  price: number;
  category: string | null;
  width: number | null;
  height: number | null;
  depth: number | null;
};

export type LocalCatalogueSearchArgs = {
  category?: string;
  keyword?: string;
  minPrice?: number;
  maxPrice?: number;
  maxWidth?: number;
  maxHeight?: number;
  maxDepth?: number;
  limit?: number;
};

export type LocalCatalogueSearchResult = {
  results: LocalCatalogueItem[];
  totalMatches: number;
  truncated: boolean;
};

const DEFAULT_RESULTS = 20;
const MAX_RESULTS = 50;

type ProductRow = {
  source_id: string | null;
  name: string;
  price: number;
  category: string | null;
  width: number | null;
  height: number | null;
  depth: number | null;
};

export function searchLocalCatalogue(
  args: LocalCatalogueSearchArgs
): LocalCatalogueSearchResult {
  const all = db
    .prepare(
      "select source_id, name, price, category, width, height, depth from products where source_id is not null"
    )
    .all() as ProductRow[];

  const category = args.category?.toLowerCase();
  const keyword = args.keyword?.toLowerCase();

  const filtered = all.filter((row) => {
    if (category && !row.category?.toLowerCase().includes(category)) {
      return false;
    }
    if (keyword) {
      const haystack = `${row.name} ${row.category ?? ""}`.toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    if (args.minPrice !== undefined && row.price < args.minPrice) return false;
    if (args.maxPrice !== undefined && row.price > args.maxPrice) return false;
    if (
      args.maxWidth !== undefined &&
      row.width !== null &&
      row.width > args.maxWidth
    ) {
      return false;
    }
    if (
      args.maxHeight !== undefined &&
      row.height !== null &&
      row.height > args.maxHeight
    ) {
      return false;
    }
    if (
      args.maxDepth !== undefined &&
      row.depth !== null &&
      row.depth > args.maxDepth
    ) {
      return false;
    }
    return true;
  });

  const limit = Math.min(args.limit ?? DEFAULT_RESULTS, MAX_RESULTS);
  const results: LocalCatalogueItem[] = filtered.slice(0, limit).map((row) => ({
    itemId: row.source_id!,
    name: row.name,
    price: row.price,
    category: row.category,
    width: row.width,
    height: row.height,
    depth: row.depth,
  }));

  return {
    results,
    totalMatches: filtered.length,
    truncated: filtered.length > results.length,
  };
}
