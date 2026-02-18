import { Product, ProductDto } from "@/shared/types";

// DTO от сервера (без картинок)
export interface ProductBasketDto {
  product: ProductDto;
  count: number;
}

// С подгруженными картинками
export interface ProductBasket {
  product: Product;
  count: number;
}
