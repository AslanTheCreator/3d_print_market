"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Container, Typography } from "@mui/material";
import { useProductsInfinite } from "@/entities/product";
import type { CategoryPath } from "@/entities/category";
import { useProfileUser } from "@/entities/user";
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

  const {
    data: profileUser,
    isLoading: isProfileLoading,
    isError: isProfileError,
    error: profileError,
    refetch: refetchProfile,
  } = useProfileUser({
    enabled: isAdultCategory && isInitialized && isAuthenticated,
  });

  const profileAge = profileUser?.age;
  const isAdultUser = typeof profileAge === "number" && profileAge >= 18;
  const isUnderageUser = typeof profileAge === "number" && profileAge < 18;
  const isAgeUnknown =
    isAdultCategory &&
    isInitialized &&
    isAuthenticated &&
    !isProfileLoading &&
    !isProfileError &&
    typeof profileAge !== "number";

  const { isVerified: isAgeVerified, confirmAge } = useAgeVerification(
    isAdultCategory && isAdultUser,
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
  const shouldWaitForAgeProfile =
    isAdultCategory && isInitialized && isAuthenticated && isProfileLoading;
  const shouldShowUnderageForbidden =
    isAdultCategory &&
    isInitialized &&
    isAuthenticated &&
    !isProfileLoading &&
    !isProfileError &&
    isUnderageUser;
  const shouldRequireAgeVerification =
    isAdultCategory &&
    isInitialized &&
    isAuthenticated &&
    isAdultUser &&
    !isAgeVerified;
  const isProfileUnauthorized =
    profileError instanceof ApiError && profileError.isUnauthorized();
  const isAgeCheckError =
    isAdultCategory &&
    isInitialized &&
    isAuthenticated &&
    (isAgeUnknown || isProfileError);
  const shouldBlockAdultAccess =
    shouldWaitForAuthInitialization ||
    shouldRequireAuthentication ||
    shouldWaitForAgeProfile ||
    shouldShowUnderageForbidden ||
    shouldRequireAgeVerification ||
    isAgeCheckError;

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
  const isCatalogLoading =
    (!hasError && isLoading) ||
    shouldWaitForAuthInitialization ||
    shouldWaitForAgeProfile;
  const shouldShowCategoryHeader =
    !isAdultCategory ||
    (!shouldWaitForAuthInitialization &&
      !shouldRequireAuthentication &&
      !shouldWaitForAgeProfile &&
      !shouldShowUnderageForbidden &&
      !shouldRequireAgeVerification &&
      !isAgeCheckError &&
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

  const handleProfileRetry = useCallback(() => {
    void refetchProfile();
  }, [refetchProfile]);

  const handleAgeReject = useCallback(() => {
    router.push("/");
  }, [router]);

  const renderCatalogContent = () => {
    if (shouldWaitForAuthInitialization || shouldWaitForAgeProfile) {
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

    if (isProfileUnauthorized) {
      return <UnauthorizedState type="adult" />;
    }

    if (shouldShowUnderageForbidden) {
      return (
        <ErrorState
          type="products"
          title="Раздел недоступен"
          description="В профиле указан возраст меньше 18 лет. Доступ к разделам 18+ закрыт."
          hideRetry
        />
      );
    }

    if (isAgeCheckError) {
      return (
        <ErrorState
          type="profile"
          title="Не удалось проверить возраст"
          description="Для доступа к разделу 18+ необходимо проверить возраст по данным профиля."
          onRetry={handleProfileRetry}
        />
      );
    }

    if (isAdultAccessForbidden) {
      return (
        <ErrorState
          type="products"
          title="Раздел недоступен"
          description="Сервер запретил доступ к этой категории. Вероятнее всего, в профиле указан возраст меньше 18 лет."
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
