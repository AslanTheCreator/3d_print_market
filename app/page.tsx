"use client";

import { Container, Typography, Box } from "@mui/material";
import { useCardsInfinite } from "@/features/product";
import { InfiniteScroll } from "@/shared/ui";
import { ProductList } from "@/entities/product";

export default function HomePage() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useCardsInfinite(10);

  if (error) return <p style={{ color: "red" }}>Ошибка: {error.message}</p>;
  return (
    <Container sx={{ pt: "20px" }}>
      <Typography component={"h2"} variant="h2">
        Свежие предзаказы
      </Typography>
      <Box pt={"20px"}>
        <InfiniteScroll
          onLoadMore={fetchNextPage}
          hasNextPage={!!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
        >
          <ProductList
            products={data?.pages.flat() ?? []}
            isLoading={isLoading}
          />
        </InfiniteScroll>
      </Box>
    </Container>
  );
}
