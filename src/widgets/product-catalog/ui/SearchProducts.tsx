"use client";

import { useMemo, useState } from "react";
import { Box, Container, Typography } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { useProductsInfinite } from "@/entities/product";
import { useAuth } from "@/entities/session";
import {
  ProductGridSkeleton,
  type PriceRange,
  type ProductFilter,
} from "@/entities/product";
import { InfiniteScroll } from "@/shared/ui/infinite-scroll";
import { PriceRangeFilter } from "./PriceRangeFilter";
import { ProductCatalog } from "./ProductCatalog";
import { SEARCH_PRODUCTS_PAGE_SIZE } from "../model/pageSizes";

export const SearchProducts = () => {
  const router = useRouter();
  const { isInitialized, sessionKey } = useAuth();
  const searchParams = useSearchParams();
  const query = searchParams?.get("query") || "";
  const [priceRange, setPriceRange] = useState<PriceRange | undefined>();

  const filters = useMemo<ProductFilter>(
    () => ({
      name: query,
      ...(priceRange ? { priceRange } : {}),
    }),
    [priceRange, query],
  );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isFetchNextPageError,
    hasNextPageError,
    isLoadMoreBlocked,
    isFetching,
    isLoading,
    refetch,
  } = useProductsInfinite(SEARCH_PRODUCTS_PAGE_SIZE, filters, undefined, {
    sessionKey,
    enabled: isInitialized,
  });

  const products = useMemo(() => data?.pages.flat() ?? [], [data?.pages]);

  const availablePriceRange = useMemo<PriceRange | undefined>(() => {
    if (products.length === 0) {
      return undefined;
    }

    let minPrice = products[0].price;
    let maxPrice = products[0].price;

    for (const product of products) {
      if (product.price < minPrice) {
        minPrice = product.price;
      }

      if (product.price > maxPrice) {
        maxPrice = product.price;
      }
    }

    return {
      minPrice,
      maxPrice,
    };
  }, [products]);

  return (
    <Container sx={{ pt: "20px" }}>
      <Typography component="h2" variant="h2">
        {query ? `Результаты поиска: "${query}"` : "Новинки"}
      </Typography>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1.5,
          mt: 2,
        }}
      >
        <PriceRangeFilter
          value={priceRange}
          availableRange={availablePriceRange}
          onApply={setPriceRange}
        />
      </Box>

      <Box pt="20px">
        <InfiniteScroll
          onLoadMore={fetchNextPage}
          hasNextPage={!!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          isLoadMoreError={hasNextPageError}
          isLoadMoreBlocked={isLoadMoreBlocked}
          loadingContent={
            <ProductGridSkeleton count={SEARCH_PRODUCTS_PAGE_SIZE} />
          }
        >
          <ProductCatalog
            products={products}
            emptyState={priceRange ? {
              description: "По выбранной цене товары не найдены. Измените или сбросьте фильтр цены.",
              actionLabel: "Сбросить фильтр цены",
              onAction: () => setPriceRange(undefined),
            } : query ? {
              description: "По вашему запросу товары не найдены. Измените запрос или сбросьте поиск.",
              actionLabel: "Сбросить поиск",
              onAction: () => router.push("/catalog/search"),
            } : undefined}
            isError={isError && !isFetchNextPageError}
            isRetrying={isFetching}
            isLoading={isLoading || !isInitialized}
            skeletonCount={SEARCH_PRODUCTS_PAGE_SIZE}
            onRetry={() => {
              void refetch();
            }}
          />
        </InfiniteScroll>
      </Box>
    </Container>
  );
};
