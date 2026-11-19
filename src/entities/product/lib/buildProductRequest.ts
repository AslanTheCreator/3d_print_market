import {
  productSortFields,
  type FetchProductsParams,
  type ProductRequestModel,
} from "../model/productRequest";

export const buildProductRequest = (
  params: FetchProductsParams,
): ProductRequestModel => {
  const { size, filters, lastId, sortBy = "DATE_DESC" } = params;
  const [, cursorField] = productSortFields[sortBy];

  return {
    ...filters,
    pageable: {
      size,
      sortBy,
      ...(lastId !== undefined && { lastId, [cursorField]: params[cursorField] }),
    },
  };
};
