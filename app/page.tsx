"use client";

import { Container, Typography, Box } from "@mui/material";
import { InfiniteScroll } from "@/shared/ui/infinite-scroll";
import { useProductsInfinite } from "@/entities/product";
import { ProductCatalog } from "@/widgets/product-catalog";

export default function HomePage() {
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
    <Container sx={{ pt: "20px" }}>
      {!error && (products.length > 0 || isLoading) && (
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
            isLoading={isLoading}
            isError={isError}
            onRetry={() => refetch()}
          />
        </InfiniteScroll>
      </Box>
    </Container>
  );
}
