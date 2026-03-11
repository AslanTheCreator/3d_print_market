"use client";

import { Box, Container, Typography } from "@mui/material";
import { useParams } from "next/navigation";
import { useProductsInfinite } from "@/entities/product";
import { InfiniteScroll } from "@/shared/ui/infinite-scroll";
import {
  CategoryPageHeader,
  ProductCatalog,
  useCategoryFilter,
} from "@/widgets/product-catalog";

export const CategoryCatalogWidget = () => {
  const params = useParams();
  const slugs = params?.slug as string[] | string;
  const categoryPath = useCategoryFilter(slugs);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    isError,
    refetch,
  } = useProductsInfinite(20, {
    categoryId: categoryPath?.categoryId,
  });

  const products = data?.pages.flat() ?? [];

  if (!categoryPath) {
    return (
      <Container sx={{ pt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {"\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u0430"}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {
            "\u041f\u043e\u0436\u0430\u043b\u0443\u0439\u0441\u0442\u0430, \u0432\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044e \u0438\u0437 \u043c\u0435\u043d\u044e"
          }
        </Typography>
      </Container>
    );
  }

  return (
    <Container sx={{ pt: "20px" }}>
      <CategoryPageHeader categoryPath={categoryPath} />

      <Box sx={{ pt: error || products.length === 0 || !isLoading ? 0 : 2.5 }}>
        <InfiniteScroll
          onLoadMore={fetchNextPage}
          hasNextPage={!!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
        >
          <ProductCatalog
            products={products}
            isLoading={isLoading}
            isError={isError}
            onRetry={refetch}
          />
        </InfiniteScroll>
      </Box>
    </Container>
  );
};
