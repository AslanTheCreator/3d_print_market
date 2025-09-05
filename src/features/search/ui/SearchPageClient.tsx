"use client";

import { Container, Typography, Box } from "@mui/material";
import { InfiniteScroll } from "@/shared/ui";
import { useSearchParams } from "next/navigation";
import { ProductCatalog } from "@/widgets/product-catalog";
import { useProductsInfinite } from "@/entities/product";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("query") || "";
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useProductsInfinite(10, {
      name: query,
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
          <ProductCatalog
            products={data?.pages.flat() ?? []}
            isLoading={isLoading}
          />
        </InfiniteScroll>
      </Box>
    </Container>
  );
}
