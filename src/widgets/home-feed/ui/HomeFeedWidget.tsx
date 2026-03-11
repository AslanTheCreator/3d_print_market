"use client";

import { Box, Container, Typography } from "@mui/material";
import { useProductsInfinite } from "@/entities/product";
import { InfiniteScroll } from "@/shared/ui/infinite-scroll";
import { ProductCatalog } from "@/widgets/product-catalog";

export const HomeFeedWidget = () => {
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
          {"\u041d\u043e\u0432\u0438\u043d\u043a\u0438"}
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
};
