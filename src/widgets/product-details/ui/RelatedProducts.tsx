"use client";

import { Box, Typography, Paper, useMediaQuery, useTheme } from "@mui/material";
import { InfiniteScroll } from "@/shared/ui/infinite-scroll";
import { useIntersectionObserver } from "usehooks-ts";
import {
  ProductCard,
  ProductCardSkeleton,
  ProductGrid,
  ProductGridItem,
  useProductsInfinite,
} from "@/entities/product";
import { useFavoritesChecks } from "@/entities/favorite";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth";
import { AddToCartButton } from "@/features/add-to-cart";
import { FavoriteButton } from "@/features/toggle-favorite";
import { Product } from "@/shared/types";

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
  const theme = useTheme();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { isProductInFavorites } = useFavoritesChecks(isAuthenticated);
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

  const skeletonCount = isMobile ? 4 : isTablet ? 6 : 8;

  if (isLoading) {
    return (
      <ProductGrid isMobile={isMobile}>
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <ProductGridItem key={index} isMobile={isMobile}>
            <ProductCardSkeleton />
          </ProductGridItem>
        ))}
      </ProductGrid>
    );
  }

  return (
    <ProductGrid isMobile={isMobile}>
      {products.map((product) => (
        <ProductGridItem key={product.id} isMobile={isMobile}>
          <Box sx={{ position: "relative" }}>
            <ProductCard
              {...product}
              onCardClick={() => router.push(`/catalog/${product.id}/detail`)}
              actions={
                <AddToCartButton
                  productId={product.id}
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

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useProductsInfinite(10, { categoryId }, undefined, {
      enabled: canLoadProducts,
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

  if (!isLoading && filteredProducts.length === 0) {
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

        {isLoading ? (
          <RelatedProductsGrid products={[]} isLoading />
        ) : (
          <InfiniteScroll
            onLoadMore={fetchNextPage}
            hasNextPage={!!hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
          >
            <RelatedProductsGrid
              products={filteredProducts}
              isLoading={isLoading}
            />
          </InfiniteScroll>
        )}
      </Box>
    </Paper>
  );
}
