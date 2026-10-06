import { usePrivateScope } from "@/shared/lib/query";
import { parsePositiveSafeInteger } from "@/shared/lib";
import { ProductNotFoundError } from "../lib/ProductNotFoundError";
import { useQuery } from "@tanstack/react-query";
import { productApi } from "../api/productApi";
import { productKeys } from "./queryKeys";
import type { Product, ProductDetail } from "./types";
import type { ProductFilter, SortBy } from "./productRequest";
import { useInfiniteProducts } from "./useInfiniteProducts";

interface ProductByIdOptions {
  initialProduct?: ProductDetail;
  initialDataUpdatedAt?: number;
  staleTime?: number;
  enabled?: boolean;
}

interface ProductsInfiniteOptions {
  sessionKey?: number | null;
  initialProducts?: Product[];
  initialDataUpdatedAt?: number;
  staleTime?: number;
  enabled?: boolean;
}

interface ProductNameSuggestionsOptions {
  enabled?: boolean;
  staleTime?: number;
}

export const useProductById = (id?: string, options?: ProductByIdOptions) => {
  const productId = parsePositiveSafeInteger(id);

  return useQuery<ProductDetail>({
    queryKey: productKeys.detail(productId ?? 0),
    queryFn: () => {
      if (productId === null) throw new Error("Некорректный ID товара");
      return productApi.getProductById(productId);
    },
    enabled: (options?.enabled ?? true) && productId !== null,
    initialData: options?.initialProduct,
    initialDataUpdatedAt: options?.initialDataUpdatedAt,
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
    retry: (failureCount, error) => !(error instanceof ProductNotFoundError) && productId !== null && failureCount < 2,
  });
};

export const useProductNameSuggestions = (
  name: string,
  options?: ProductNameSuggestionsOptions,
) => {
  const normalizedName = name.trim();

  return useQuery<string[]>({
    queryKey: productKeys.nameSuggestions(normalizedName),
    queryFn: () => productApi.findProductNames(normalizedName),
    enabled: (options?.enabled ?? true) && normalizedName.length >= 2,
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
    retry: 1,
  });
};

export const useProductsInfinite = (
  size: number,
  filters?: ProductFilter,
  sortBy?: SortBy,
  options?: ProductsInfiniteOptions,
) => {
  const sessionKey = options?.sessionKey ?? null;

  return useInfiniteProducts({
    size,
    filters,
    sortBy,
    fetchFunction: (params) => productApi.getProducts(params, sessionKey !== null),
    queryKey: productKeys.catalog(sessionKey),
    initialData:
      sessionKey === null && options?.initialProducts !== undefined
        ? {
            pages: [options.initialProducts],
            pageParams: [null],
          }
        : undefined,
    initialDataUpdatedAt: options?.initialDataUpdatedAt,
    staleTime: options?.staleTime,
    enabled: options?.enabled,
  });
};

export const useUserProductsInfinite = (
  size: number,
  filters?: ProductFilter,
  sortBy?: SortBy,
) => {
  const scope = usePrivateScope();
  return useInfiniteProducts({
    size,
    filters,
    sortBy,
    fetchFunction: productApi.getUserProducts,
    enabled: scope.id !== null,
    queryKey: scope.key(productKeys.userLists()),
  });
};
