"use client";

import { Typography, Box } from "@mui/material";
import { InfiniteScroll } from "@/shared/ui";
import { useProductsInfinite } from "@/entities/product";
import { ProductCatalog } from "@/widgets/product-catalog";

export const HomeProductCatalog = () => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    isError,
    refetch,
  } = useProductsInfinite(18);

  const products = data?.pages.flat() ?? [];

  return (
    <>
      {!error && (products.length > 0 || isLoading) && (
        <Typography
          component="h1"
          variant="h2"
          sx={{
            mb: { xs: 2, sm: 3 },
            fontSize: { xs: "1.75rem", sm: "2rem" },
          }}
        >
          Свежие предзаказы
        </Typography>
      )}
      <Box pt={error || products.length === 0 ? 0 : "20px"}>
        <InfiniteScroll
          onLoadMore={fetchNextPage}
          hasNextPage={!!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
        >
          <ProductCatalog
            products={products}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => refetch()}
          />
        </InfiniteScroll>
      </Box>
    </>
  );
};
