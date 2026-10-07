"use client";

import { Alert, Box, Button, Typography, Paper } from "@mui/material";
import { ErrorState } from "@/shared/ui/states";
import { InfiniteScroll } from "@/shared/ui/infinite-scroll";
import { useIntersectionObserver } from "usehooks-ts";
import {
  ProductCard,
  ProductGrid,
  ProductGridSkeleton,
  ProductGridItem,
  useProductsInfinite,
} from "@/entities/product";
import { useFavoritesChecks } from "@/entities/favorite";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/entities/session";
import { AddToCartButton } from "@/features/add-to-cart";
import { FavoriteButton } from "@/features/toggle-favorite";
import { Product } from "@/entities/product";

interface RelatedProductsProps {
  categoryId: number;
  excludeProductId: number;
}

interface RelatedProductsGridProps {
  products: Product[];
  isLoading: boolean;
}

const RelatedProductsGrid = ({
  products,
  isLoading,
}: RelatedProductsGridProps) => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { isProductInFavorites } = useFavoritesChecks(isAuthenticated);

  if (isLoading) {
    return (
      <ProductGridSkeleton count={9} />
    );
  }

  return (
    <ProductGrid>
      {products.map((product) => (
        <ProductGridItem key={product.id}>
          <Box sx={{ position: "relative" }}>
            <ProductCard
              {...product}
              onCardClick={() => router.push(`/catalog/${product.id}/detail`)}
              actions={
                <AddToCartButton
                  productId={product.id}
                  sellerId={product.sellerId}
                  availability={product.availability}
                  productName={product.name}
                  stockCount={product.count}
                />
              }
            />
            <FavoriteButton
              productId={product.id}
              isFavorite={isProductInFavorites(product.id)}
              productName={product.name}
            />
          </Box>
        </ProductGridItem>
      ))}
    </ProductGrid>
  );
};

export function RelatedProducts({
  categoryId,
  excludeProductId,
}: RelatedProductsProps) {
  const { isInitialized, sessionKey } = useAuth();
  const [canLoadProducts, setCanLoadProducts] = useState(false);
  const { ref, entry } = useIntersectionObserver({
    threshold: 0,
    rootMargin: "600px",
  });

  useEffect(() => {
    if (entry?.isIntersecting) {
      setCanLoadProducts(true);
    }
  }, [entry?.isIntersecting]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading,
    isError, refetch, isFetching, hasNextPageError, isLoadMoreBlocked, isFetchNextPageError } =
    useProductsInfinite(10, { categoryId }, undefined, {
      sessionKey,
      enabled: isInitialized && canLoadProducts,
    });

  const filteredProducts = useMemo(
    () =>
      (data?.pages.flat() ?? []).filter(
        (product) => product.id !== excludeProductId,
      ),
    [data, excludeProductId],
  );

  if (!canLoadProducts) {
    return <div ref={ref} />;
  }

  if (!isLoading && !isError && filteredProducts.length === 0) {
    return null;
  }

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: { xs: 2.5 },
        overflow: "hidden",
        mb: { xs: 10, sm: 0 },
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Box p={{ xs: 2, sm: 3 }}>
        <Typography
          variant="h5"
          fontWeight="bold"
          mb={{ xs: 2, sm: 3 }}
          sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}
        >
          Похожие товары
        </Typography>

        {isError && !data ? (
          <ErrorState type="products" onRetry={() => void refetch()} retryPending={isFetching} />
        ) : isLoading ? (
          <RelatedProductsGrid products={[]} isLoading />
        ) : (
          <InfiniteScroll
            onLoadMore={fetchNextPage}
            hasNextPage={!!hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            isLoadMoreError={hasNextPageError}
            isLoadMoreBlocked={isLoadMoreBlocked}
            loadingContent={<ProductGridSkeleton count={10} />}
          >
            <RelatedProductsGrid
              products={filteredProducts}
              isLoading={isLoading}
            />
            {isError && !isFetchNextPageError && (
              <Alert severity="error" sx={{ mt: 2 }} action={
                <Button color="inherit" disabled={isFetching} onClick={() => void refetch()}>
                  {isFetching ? "Загрузка..." : "Повторить обновление"}
                </Button>
              }>
                Не удалось обновить товары. Показаны ранее загруженные данные.
              </Alert>
            )}
          </InfiniteScroll>
        )}
      </Box>
    </Paper>
  );
}
