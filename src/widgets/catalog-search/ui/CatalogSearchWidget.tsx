"use client";

import { Suspense } from "react";
import { Box, Container, Typography } from "@mui/material";
import { useSearchParams } from "next/navigation";
import { useProductsInfinite } from "@/entities/product";
import { InfiniteScroll } from "@/shared/ui/infinite-scroll";
import { ProductCatalog } from "@/widgets/product-catalog";

const SearchContent = () => {
  const searchParams = useSearchParams();
  const query = searchParams?.get("query") || "";

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useProductsInfinite(10, {
      name: query,
    });

  return (
    <Container sx={{ pt: "20px" }}>
      <Typography component="h2" variant="h2">
        {query
          ? `\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u044b \u043f\u043e\u0438\u0441\u043a\u0430: "${query}"`
          : "\u041d\u043e\u0432\u0438\u043d\u043a\u0438"}
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
};

export const CatalogSearchWidget = () => {
  return (
    <Suspense fallback={<div>{"\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430..."}</div>}>
      <SearchContent />
    </Suspense>
  );
};
