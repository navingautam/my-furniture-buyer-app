// Shape of a row in the local `products` table (see db/schema.sql).
export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
};
