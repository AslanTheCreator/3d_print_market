"use client";

import { useState } from "react";
import { Box, Container, Typography } from "@mui/material";
import { useProductsInfinite } from "@/entities/product";
import type { Product } from "@/shared/types";
import { InfiniteScroll } from "@/shared/ui/infinite-scroll";
import { ProductCatalog } from "@/widgets/product-catalog";

interface HomeProductsProps {
  initialProducts: Product[];
  initialDataUpdatedAt: number;
  initialError: boolean;
  pageSize: number;
}

export const HomeProducts = ({
  initialProducts,
  initialDataUpdatedAt,
  initialError,
  pageSize,
}: HomeProductsProps) => {
  const [hasInitialError, setHasInitialError] = useState(initialError);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useProductsInfinite(pageSize, undefined, "DATE_DESC", {
    initialProducts: initialError ? undefined : initialProducts,
    initialDataUpdatedAt,
    enabled: !hasInitialError,
  });

  const products = data?.pages.flat() ?? [];
  const hasError = hasInitialError || isError;
  const isCatalogLoading = !hasError && isLoading;

  const handleRetry = () => {
    setHasInitialError(false);
    void refetch();
  };

  return (
    <Container sx={{ pt: "20px" }}>
      {!hasError && (products.length > 0 || isCatalogLoading) && (
        <Typography
          component="h1"
          variant="h2"
          sx={{
            mb: { xs: 2, sm: 3 },
            fontSize: { xs: "1.75rem", sm: "2rem" },
          }}
        >
          Новинки
        </Typography>
      )}

      <Box>
        <InfiniteScroll
          onLoadMore={fetchNextPage}
          hasNextPage={!!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
        >
          <ProductCatalog
            products={products}
            isLoading={isCatalogLoading}
            isError={hasError}
            onRetry={handleRetry}
          />
        </InfiniteScroll>
      </Box>
    </Container>
  );
};
