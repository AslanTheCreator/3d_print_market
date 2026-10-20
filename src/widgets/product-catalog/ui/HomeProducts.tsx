"use client";

import { useState } from "react";
import { Alert, Box, Button, Container, Skeleton, Typography } from "@mui/material";
import { useProductsInfinite, usePublicGiveaway } from "@/entities/product";
import { useAuth } from "@/entities/session";
import { ProductGridSkeleton, type Product } from "@/entities/product";
import { InfiniteScroll } from "@/shared/ui/infinite-scroll";
import { ProductCatalog } from "./ProductCatalog";
import { ProductGridItem } from "@/entities/product";
import { GiveawayCard } from "./GiveawayCard";

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
  const { isInitialized, isAuthenticated, sessionKey } = useAuth();
  const giveaway = usePublicGiveaway();
  const giveawayContent = giveaway.isPending
    ? <Skeleton variant="rectangular" height={280} aria-label="Загрузка розыгрыша" />
    : giveaway.isError
      ? <Alert severity="warning" action={<Button sx={{ minHeight: 44 }} disabled={giveaway.isFetching} onClick={() => void giveaway.refetch()}>Повторить загрузку розыгрыша</Button>}>Не удалось загрузить розыгрыш.</Alert>
      : giveaway.data && (giveaway.timing.phase === "scheduled" || giveaway.timing.phase === "active")
        ? <GiveawayCard giveaway={giveaway.data} timing={giveaway.timing} /> : null;
  const [hasInitialError, setHasInitialError] = useState(initialError);
  const shouldBlockQuery = hasInitialError && !isAuthenticated;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    hasNextPageError,
    isLoadMoreBlocked,
    isFetching,
    isLoading,
    isError,
    refetch,
  } = useProductsInfinite(pageSize, undefined, "DATE_DESC", {
    sessionKey,
    initialProducts: initialError ? undefined : initialProducts,
    initialDataUpdatedAt,
    enabled: isInitialized && !shouldBlockQuery,
  });

  const products = data?.pages.flat() ?? [];
  const hasError = shouldBlockQuery || isError;
  const isCatalogLoading = !hasError && isLoading;

  const handleRetry = () => {
    setHasInitialError(false);
    void refetch();
  };

  return (
    <Container sx={{ pt: "20px" }}>
      {(products.length > 0 || giveawayContent || (!hasError && isCatalogLoading)) && (
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
          isLoadMoreError={hasNextPageError}
          isLoadMoreBlocked={isLoadMoreBlocked}
          loadingContent={<ProductGridSkeleton count={pageSize} />}
        >
          <ProductCatalog
            products={products}
            leadingContent={giveawayContent ? (
              <ProductGridItem xs={12} sm={6} md={6} lg={4}>
                {giveawayContent}
              </ProductGridItem>
            ) : undefined}
            isLoading={isCatalogLoading}
            isError={hasError && !isFetchNextPageError}
            isRetrying={isFetching}
            onRetry={handleRetry}
            skeletonCount={pageSize}
          />
        </InfiniteScroll>
      </Box>
    </Container>
  );
};
