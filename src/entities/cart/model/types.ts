import { Product } from "@/entities/product";

export interface ProductBasket {
  product: Product;
  count: number;
}
