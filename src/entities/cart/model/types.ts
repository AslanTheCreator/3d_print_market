import { Product, ProductDto } from "@/shared/types";

// DTO от сервера (без картинок)
export interface ProductBasketDto {
  product: ProductDto;
  count: number;
  availableCount: number | null;
  enoughStock: boolean;
}

// С подгруженными картинками
export interface ProductBasket {
  product: Product;
  count: number;
  availableCount: number | null;
  enoughStock: boolean;
}
