"use client";

import { Typography, Container, Box } from "@mui/material";
import { useParams } from "next/navigation";
import { InfiniteScroll } from "@/shared/ui/infinite-scroll";
import { useProductsInfinite } from "@/entities/product";
import { ProductCatalog } from "@/widgets/product-catalog";
import {
  CategoryPageHeader,
  useCategoryFilter,
} from "@/features/product/filter-by-category";

export default function CategoryPage() {
  const params = useParams();
  const slugs = params?.slug as string[] | string;

  // Получаем данные категории и навигации
  const categoryPath = useCategoryFilter(slugs);

  // Получаем продукты с бесконечной прокруткой
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

  // Объединяем все страницы в один массив продуктов
  const products = data?.pages.flat() ?? [];

  // Если categoryId не удалось извлечь, показываем ошибку
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
