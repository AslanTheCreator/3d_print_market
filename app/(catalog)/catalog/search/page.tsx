"use client";

import { Container, Typography, Box } from "@mui/material";
import { InfiniteScroll } from "@/shared/ui/infinite-scroll";
import { useSearchParams } from "next/navigation";
import { useProductsInfinite } from "@/entities/product";
import { ProductCatalog } from "@/widgets/product-catalog";
import { Suspense } from "react";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams?.get("query") || "";

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useProductsInfinite(10, {
      name: query,
    });
  return (
    <Suspense fallback={<div>Загрузка...</div>}>
      <Container sx={{ pt: "20px" }}>
        <Typography component="h2" variant="h2">
          {query ? `Результаты поиска: "${query}"` : "Свежие предзаказы"}
        </Typography>
        <Box pt="20px">
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
    </Suspense>
  );
}
