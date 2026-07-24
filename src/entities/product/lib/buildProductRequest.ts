import type {
  FetchProductsParams,
  ProductRequestModel,
} from "../model/productRequest";

export const buildProductRequest = (
  params: FetchProductsParams,
): ProductRequestModel => {
  const {
    size,
    filters,
    lastCreatedAt,
    lastPrice,
    lastId,
    sortBy = "DATE_DESC",
  } = params;

  return {
    pageable: {
      size,
      ...(lastCreatedAt !== undefined ? { lastCreatedAt } : {}),
      ...(lastPrice !== undefined ? { lastPrice } : {}),
      ...(lastId !== undefined ? { lastId } : {}),
      sortBy,
    },
    ...filters,
  };
};
