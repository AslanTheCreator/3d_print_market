"use client";

import { Suspense } from "react";
import { Box, Container, Typography } from "@mui/material";
import { useSearchParams } from "next/navigation";
import { useProductsInfinite } from "@/entities/product";
import { InfiniteScroll } from "@/shared/ui/infinite-scroll";
import { ProductCatalog } from "@/widgets/product-catalog";

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams?.get("query") || "";

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useProductsInfinite(10, {
      name: query,
    });

  return (
    <Container sx={{ pt: "20px" }}>
      <Typography component="h2" variant="h2">
        {query ? `Результаты поиска: "${query}"` : "Новинки"}
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
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Загрузка...</div>}>
      <SearchContent />
    </Suspense>
  );
}
