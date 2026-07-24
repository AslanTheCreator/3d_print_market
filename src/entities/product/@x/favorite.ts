import { productKeys } from "../model/queryKeys";

export const favoriteProductKeys = {
  lists: productKeys.lists,
};

export { buildProductRequest } from "../lib/buildProductRequest";
export type { FetchProductsParams } from "../model/productRequest";
export type { Product, ProductDto } from "../model/types";
