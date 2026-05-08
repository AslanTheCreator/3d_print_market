"use client";

import { useCallback, useMemo, useState } from "react";
import { Box, Container, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useProductsInfinite } from "@/entities/product";
import type { CategoryPath } from "@/entities/category";
import {
  AgeVerificationGate,
  isAdultCategoryPath,
  useAgeVerification,
} from "@/features/age-verification";
import { InfiniteScroll } from "@/shared/ui/infinite-scroll";
import type { PriceRange, Product, ProductFilter } from "@/shared/types";
import { CategoryPageHeader, ProductCatalog } from "@/widgets/product-catalog";

interface CategoryProductsProps {
  categoryPath: CategoryPath | null;
  initialProducts: Product[];
  initialError: boolean;
  pageSize: number;
}

export const CategoryProducts = ({
  categoryPath,
  initialProducts,
  initialError,
  pageSize,
}: CategoryProductsProps) => {
  const router = useRouter();
  const [priceRange, setPriceRange] = useState<PriceRange | undefined>();
  const [hasInitialError, setHasInitialError] = useState(initialError);

  const isAgeVerificationRequired = useMemo(() => {
    return categoryPath ? isAdultCategoryPath(categoryPath) : false;
  }, [categoryPath]);
  const { isVerified, confirmAge } = useAgeVerification(
    isAgeVerificationRequired,
  );

  const filters = useMemo<ProductFilter | undefined>(() => {
    if (!categoryPath) {
      return undefined;
    }

    return {
      categoryId: categoryPath.categoryId,
      ...(priceRange ? { priceRange } : {}),
    };
  }, [categoryPath, priceRange]);

  const isBaseFilter = priceRange === undefined;
  const shouldUseInitialProducts =
    isBaseFilter && !initialError && !isAgeVerificationRequired;
  const shouldBlockQuery = isBaseFilter && hasInitialError;
  const shouldWaitForAgeConfirmation =
    isAgeVerificationRequired && !isVerified;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useProductsInfinite(pageSize, filters, "DATE_DESC", {
    initialProducts: shouldUseInitialProducts ? initialProducts : undefined,
    enabled:
      Boolean(categoryPath) &&
      !shouldBlockQuery &&
      !shouldWaitForAgeConfirmation,
  });

  const products = useMemo(() => data?.pages.flat() ?? [], [data?.pages]);
  const hasError = shouldBlockQuery || isError;
  const isCatalogLoading =
    (!hasError && isLoading) || shouldWaitForAgeConfirmation;

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

  const handleAgeReject = useCallback(() => {
    router.replace("/");
  }, [router]);

  const handleRetry = useCallback(() => {
    setHasInitialError(false);
    void refetch();
  }, [refetch]);

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
      <AgeVerificationGate
        open={isAgeVerificationRequired && !isVerified}
        onConfirm={confirmAge}
        onReject={handleAgeReject}
      >
        <CategoryPageHeader
          categoryPath={categoryPath}
          priceRange={priceRange}
          availablePriceRange={availablePriceRange}
          onPriceRangeApply={setPriceRange}
        />

        <Box
          sx={{ pt: hasError || products.length === 0 || !isLoading ? 0 : 2.5 }}
        >
          <InfiniteScroll
            onLoadMore={fetchNextPage}
            hasNextPage={!!hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
          >
            <ProductCatalog
              products={products}
              isLoading={isCatalogLoading}
              isError={hasError}
              onRetry={handleRetry}
            />
          </InfiniteScroll>
        </Box>
      </AgeVerificationGate>
    </Container>
  );
};
