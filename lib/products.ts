// Shape used to render a product card on the home page. Category/name/price
// come live from the catalogue API (see lib/catalogue-api.ts); imageUrl and
// cartProductId (the local `products.id`, see db/schema.sql) come from a
// join against our own database so "Add to cart" keeps working — the
// catalogue API's lightweight search-index endpoint doesn't include images.
export type DisplayProduct = {
  itemId: string;
  cartProductId: string | null;
  name: string;
  category: string | null;
  price: number;
  imageUrl: string | null;
};
