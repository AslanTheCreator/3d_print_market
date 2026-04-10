"use client";

import { useMemo, useState } from "react";
import { Box, Container, Typography } from "@mui/material";
import { useParams } from "next/navigation";
import { useProductsInfinite } from "@/entities/product";
import { InfiniteScroll } from "@/shared/ui/infinite-scroll";
import type { PriceRange, ProductFilter } from "@/shared/types";
import {
  CategoryPageHeader,
  ProductCatalog,
  useCategoryFilter,
} from "@/widgets/product-catalog";

export default function CategoryPage() {
  const params = useParams();
  const slugs = params?.slug as string[] | string;
  const categoryPath = useCategoryFilter(slugs);
  const [priceRange, setPriceRange] = useState<PriceRange | undefined>();

  const filters = useMemo<ProductFilter | undefined>(() => {
    if (!categoryPath) {
      return undefined;
    }

    return {
      categoryId: categoryPath.categoryId,
      ...(priceRange ? { priceRange } : {}),
    };
  }, [categoryPath, priceRange]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    isError,
    refetch,
  } = useProductsInfinite(20, filters);

  const products = data?.pages.flat() ?? [];
  const availablePriceRange = useMemo<PriceRange | undefined>(() => {
    if (products.length === 0) {
      return undefined;
    }

    let minPrice = products[0].price;
    let maxPrice = products[0].price;

    for (const product of products) {
      if (product.price < minPrice) {
        minPrice = product.price;
      }

      if (product.price > maxPrice) {
        maxPrice = product.price;
      }
    }

    return {
      minPrice,
      maxPrice,
    };
  }, [products]);

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
      <CategoryPageHeader
        categoryPath={categoryPath}
        priceRange={priceRange}
        availablePriceRange={availablePriceRange}
        onPriceRangeApply={setPriceRange}
      />

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
