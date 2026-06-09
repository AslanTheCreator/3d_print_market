"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Container, Typography } from "@mui/material";
import { useProductsInfinite } from "@/entities/product";
import type { CategoryPath } from "@/entities/category";
import { useAuth } from "@/features/auth";
import {
  AgeVerificationGate,
  isAdultCategoryPath,
  useAgeVerification,
} from "@/features/age-verification";
import { ApiError } from "@/shared/lib/errorHandler";
import { InfiniteScroll } from "@/shared/ui/infinite-scroll";
import { ErrorState, UnauthorizedState } from "@/shared/ui/states";
import type { PriceRange, Product, ProductFilter } from "@/shared/types";
import { CategoryPageHeader, ProductCatalog } from "@/widgets/product-catalog";

interface CategoryProductsProps {
  categoryPath: CategoryPath | null;
  initialProducts: Product[];
  initialDataUpdatedAt: number;
  initialError: boolean;
  pageSize: number;
}

export const CategoryProducts = ({
  categoryPath,
  initialProducts,
  initialDataUpdatedAt,
  initialError,
  pageSize,
}: CategoryProductsProps) => {
  const router = useRouter();
  const [priceRange, setPriceRange] = useState<PriceRange | undefined>();
  const [hasInitialError, setHasInitialError] = useState(initialError);
  const { isAuthenticated, isInitialized } = useAuth();

  const isAdultCategory = useMemo(() => {
    return categoryPath ? isAdultCategoryPath(categoryPath) : false;
  }, [categoryPath]);

  const { isVerified: isAgeVerified, confirmAge } = useAgeVerification(
    isAdultCategory && isInitialized && isAuthenticated,
  );

  const filters = useMemo<ProductFilter | undefined>(() => {
    if (!categoryPath) {
      return undefined;
    }

    return {
      categoryId: categoryPath.categoryId,
      ...(isAdultCategory ? { includeAdult: true } : {}),
      ...(priceRange ? { priceRange } : {}),
    };
  }, [categoryPath, isAdultCategory, priceRange]);

  const isBaseFilter = priceRange === undefined;
  const shouldUseInitialProducts =
    isBaseFilter && !initialError && !isAdultCategory;
  const shouldBlockQuery = isBaseFilter && hasInitialError;
  const shouldWaitForAuthInitialization =
    isAdultCategory && !isInitialized;
  const shouldRequireAuthentication =
    isAdultCategory && isInitialized && !isAuthenticated;
  const shouldRequireAgeVerification =
    isAdultCategory &&
    isInitialized &&
    isAuthenticated &&
    !isAgeVerified;
  const shouldBlockAdultAccess =
    shouldWaitForAuthInitialization ||
    shouldRequireAuthentication ||
    shouldRequireAgeVerification;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useProductsInfinite(pageSize, filters, "DATE_DESC", {
    initialProducts: shouldUseInitialProducts ? initialProducts : undefined,
    initialDataUpdatedAt,
    enabled:
      Boolean(categoryPath) &&
      !shouldBlockQuery &&
      !shouldWaitForAuthInitialization &&
      !shouldBlockAdultAccess,
  });

  const products = useMemo(() => data?.pages.flat() ?? [], [data?.pages]);
  const hasError = shouldBlockQuery || isError;
  const isAdultAccessForbidden =
    isAdultCategory && error instanceof ApiError && error.isForbidden();
  const adultAccessForbiddenMessage =
    error instanceof ApiError ? error.message : undefined;
  const isCatalogLoading =
    (!hasError && isLoading) || shouldWaitForAuthInitialization;
  const shouldShowCategoryHeader =
    !isAdultCategory ||
    (!shouldWaitForAuthInitialization &&
      !shouldRequireAuthentication &&
      !shouldRequireAgeVerification &&
      !isAdultAccessForbidden);

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

  const handleRetry = useCallback(() => {
    setHasInitialError(false);
    void refetch();
  }, [refetch]);

  const handleAgeReject = useCallback(() => {
    router.push("/");
  }, [router]);

  const renderCatalogContent = () => {
    if (shouldWaitForAuthInitialization) {
      return (
        <ProductCatalog
          products={products}
          isLoading
          isError={false}
          onRetry={handleRetry}
        />
      );
    }

    if (shouldRequireAuthentication) {
      return <UnauthorizedState type="adult" />;
    }

    if (isAdultAccessForbidden) {
      return (
        <ErrorState
          type="products"
          title="Раздел недоступен"
          description={adultAccessForbiddenMessage}
          hideRetry
        />
      );
    }

    return (
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
    );
  };

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

  const pageContent = (
    <Container sx={{ pt: "20px" }}>
      {shouldShowCategoryHeader && (
        <CategoryPageHeader
          categoryPath={categoryPath}
          priceRange={priceRange}
          availablePriceRange={availablePriceRange}
          onPriceRangeApply={setPriceRange}
        />
      )}

      <Box
        sx={{ pt: hasError || products.length === 0 || !isLoading ? 0 : 2.5 }}
      >
        {renderCatalogContent()}
      </Box>
    </Container>
  );

  if (isAdultCategory) {
    return (
      <AgeVerificationGate
        open={isInitialized && shouldRequireAgeVerification}
        onConfirm={confirmAge}
        onReject={handleAgeReject}
      >
        {pageContent}
      </AgeVerificationGate>
    );
  }

  return pageContent;
};
