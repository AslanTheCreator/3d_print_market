import { usePrivateScope } from "@/shared/lib/query";
import { parsePositiveSafeInteger } from "@/shared/lib";
import { ProductNotFoundError } from "../lib/ProductNotFoundError";
import { hashKey, useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
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
  restartOnCriteriaChange?: boolean;
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
  const catalogId = useId();
  const criteria = options?.restartOnCriteriaChange
    ? hashKey([size, filters, sortBy ?? "DATE_DESC"])
    : null;
  const [traversal, setTraversal] = useState({ criteria, revision: 0 });
  let revision = traversal.revision;
  if (traversal.criteria !== criteria) {
    revision++;
    setTraversal({ criteria, revision });
  }

  const catalogKey = productKeys.catalog(sessionKey);
  // A new traversal must not restore the pages or SSR seed of an earlier one.
  const queryKey = revision === 0 ? catalogKey : [...catalogKey, { catalogId, revision }];

  return useInfiniteProducts({
    size,
    filters,
    sortBy,
    fetchFunction: (params, signal) => productApi.getProducts(params, sessionKey !== null, signal),
    queryKey,
    initialData:
      revision === 0 && sessionKey === null && options?.initialProducts !== undefined
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

export const USER_PRODUCTS_PAGE_SIZE = 100;

export const useUserProductsInfinite = (
  size: number,
  filters?: ProductFilter,
  sortBy?: SortBy,
  options?: { enabled?: boolean },
) => {
  const scope = usePrivateScope();
  return useInfiniteProducts({
    size,
    filters,
    sortBy,
    fetchFunction: productApi.getUserProducts,
    refetchOnWindowFocus: true,
    enabled: scope.id !== null && (options?.enabled ?? true),
    queryKey: scope.key(productKeys.userLists()),
  });
};
