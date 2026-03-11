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

export default function CategoryPage() {
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
          Категория не найдена
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Пожалуйста, выберите категорию из меню
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
}
