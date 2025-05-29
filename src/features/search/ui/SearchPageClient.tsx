"use client";

import { useCardsInfinite } from "@/features/product";
import { Container, Typography, Box } from "@mui/material";
import { ProductList } from "@/entities/product";
import { InfiniteScroll } from "@/shared/ui";
import { useSearchParams } from "next/navigation";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("query") || "";
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useCardsInfinite(10, {
    productName: query,
  });

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
