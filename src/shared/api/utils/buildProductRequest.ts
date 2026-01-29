import { FetchProductsParams, ProductRequestModel } from "@/shared/types";

/**
 * Строит тело запроса для API товаров
 */
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
      ...(lastCreatedAt && { lastCreatedAt }),
      ...(lastPrice && { lastPrice }),
      ...(lastId && { lastId }),
      sortBy,
    },
    ...filters,
  };
};
