"use client";

import { Typography, Box, Container, Breadcrumbs, Link } from "@mui/material";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import NextLink from "next/link";
import HomeIcon from "@mui/icons-material/Home";
import { InfiniteScroll } from "@/shared/ui";
import { useProductsInfinite } from "@/entities/product";
import { ProductCatalog } from "@/widgets/product-catalog";

/**
 * Извлекает ID категории из массива slug'ов
 * Логика: берем последний элемент массива как текущую категорию
 */
const extractCategoryId = (slugs: string[] | string): number | null => {
  if (!slugs) return null;

  const slugArray = Array.isArray(slugs) ? slugs : [slugs];

  if (slugArray.length === 0) return null;

  // Берем последний элемент как текущую категорию
  const lastSlug = slugArray[slugArray.length - 1];
  const categoryIdString = lastSlug.split("-")[0];
  const categoryId = parseInt(categoryIdString, 10);

  return isNaN(categoryId) ? null : categoryId;
};

/**
 * Создает элементы хлебных крошек из массива slug'ов
 */
const createBreadcrumbs = (slugs: string[] | string) => {
  if (!slugs) return [];

  const slugArray = Array.isArray(slugs) ? slugs : [slugs];

  return slugArray.map((slug, index) => {
    const parts = slug.split("-");
    const categoryId = parts[0];
    const categoryName = parts.slice(1).join(" ").replace(/-/g, " ");

    // Создаем путь для текущего уровня
    const path = `/catalog/category/${slugArray.slice(0, index + 1).join("/")}`;

    return {
      id: categoryId,
      name: categoryName || `Категория ${categoryId}`,
      path: path,
      isLast: index === slugArray.length - 1,
    };
  });
};

/**
 * Генерирует заголовок страницы на основе пути категорий
 */
const generatePageTitle = (slugs: string[] | string): string => {
  if (!slugs) return "Каталог товаров";

  const slugArray = Array.isArray(slugs) ? slugs : [slugs];

  if (slugArray.length === 0) return "Каталог товаров";

  // Извлекаем имена категорий из slug'ов
  const categoryNames = slugArray.map((slug) => {
    const parts = slug.split("-");
    // Убираем первый элемент (ID) и объединяем остальные
    return parts.slice(1).join(" ").replace(/-/g, " ");
  });

  const lastCategoryName = categoryNames[categoryNames.length - 1];

  return lastCategoryName
    ? `Товары категории "${lastCategoryName}"`
    : "Каталог товаров";
};

export default function CategoryPage() {
  const params = useParams();
  const slugs = params.slug as string[] | string;

  // Мемоизируем вычисления для оптимизации
  const { categoryId, breadcrumbs, pageTitle } = useMemo(
    () => ({
      categoryId: extractCategoryId(slugs),
      breadcrumbs: createBreadcrumbs(slugs),
      pageTitle: generatePageTitle(slugs),
    }),
    [slugs]
  );

  // Получаем продукты с бесконечной прокруткой
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch,
  } = useProductsInfinite(20, {
    categoryId: categoryId || undefined,
  });

  // Объединяем все страницы в один массив продуктов
  const products = useMemo(() => data?.pages.flat() ?? [], [data?.pages]);

  // Если categoryId не удалось извлечь, показываем ошибку
  if (!categoryId) {
    return (
      <Container sx={{ pt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Ошибка
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Некорректный путь категории
        </Typography>
      </Container>
    );
  }

  return (
    <Container sx={{ pt: 2.5 }}>
      {/* Хлебные крошки */}
      <Breadcrumbs
        aria-label="breadcrumb"
        sx={{
          mb: 3,
          "& .MuiBreadcrumbs-separator": {
            color: "text.secondary",
          },
        }}
      >
        {/* Главная страница */}
        <Link
          component={NextLink}
          href="/"
          underline="hover"
          sx={{
            display: "flex",
            alignItems: "center",
            color: "text.secondary",
            "&:hover": {
              color: "primary.main",
            },
          }}
        >
          <HomeIcon sx={{ mr: 0.5, fontSize: 20 }} />
          Главная
        </Link>

        {/* Каталог */}
        <Link
          component={NextLink}
          href="/catalog"
          underline="hover"
          sx={{
            color: "text.secondary",
            "&:hover": {
              color: "primary.main",
            },
          }}
        >
          Каталог
        </Link>

        {/* Категории */}
        {breadcrumbs.map((breadcrumb) =>
          breadcrumb.isLast ? (
            <Typography
              key={breadcrumb.id}
              color="text.primary"
              sx={{ fontWeight: 500 }}
            >
              {breadcrumb.name}
            </Typography>
          ) : (
            <Link
              key={breadcrumb.id}
              component={NextLink}
              href={breadcrumb.path}
              underline="hover"
              sx={{
                color: "text.secondary",
                "&:hover": {
                  color: "primary.main",
                },
              }}
            >
              {breadcrumb.name}
            </Link>
          )
        )}
      </Breadcrumbs>

      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{
          mb: 3,
          fontWeight: 600,
          color: "text.primary",
        }}
      >
        {pageTitle}
      </Typography>

      <Box sx={{ pt: error || products.length === 0 ? 0 : 2.5 }}>
        <InfiniteScroll
          onLoadMore={fetchNextPage}
          hasNextPage={!!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
        >
          <ProductCatalog
            products={products}
            isLoading={isLoading}
            error={error}
            onRetry={refetch}
          />
        </InfiniteScroll>
      </Box>
    </Container>
  );
}
