"use client";

import { useCallback, useMemo, useState } from "react";
import NextLink from "next/link";
import {
  Box,
  Breadcrumbs,
  Button,
  Container,
  FormControl,
  InputLabel,
  Link as MuiLink,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { useProductsInfinite } from "@/entities/product";
import { useUserById } from "@/entities/user";
import type { PriceRange, ProductFilter, SortBy } from "@/shared/types";
import { EmptyCatalogState, ErrorState } from "@/shared/ui/states";
import { InfiniteScroll } from "@/shared/ui/infinite-scroll";
import { PriceRangeFilter, ProductCatalog } from "@/widgets/product-catalog";
import {
  SellerProfileHeader,
  SellerProfileHeaderSkeleton,
} from "@/widgets/seller-profile";

const PAGE_SIZE = 12;

const SORT_OPTIONS: Array<{ value: SortBy; label: string }> = [
  { value: "DATE_DESC", label: "Сначала новые" },
  { value: "PRICE_ASC", label: "Сначала дешевле" },
  { value: "PRICE_DESC", label: "Сначала дороже" },
];

const getAvailablePriceRange = (
  products: Array<{ price: number }>,
): PriceRange | undefined => {
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
};

interface SellerPageClientProps {
  sellerId: string;
}

export const SellerPageClient = ({ sellerId }: SellerPageClientProps) => {
  const sellerIdNumber = Number(sellerId);
  const isSellerIdValid =
    Number.isInteger(sellerIdNumber) && sellerIdNumber > 0;
  const [priceRange, setPriceRange] = useState<PriceRange | undefined>();
  const [sortBy, setSortBy] = useState<SortBy>("DATE_DESC");

  const {
    data: seller,
    isLoading: isSellerLoading,
    isError: isSellerError,
    refetch: refetchSeller,
  } = useUserById(isSellerIdValid ? sellerIdNumber : undefined);

  const filters = useMemo<ProductFilter | undefined>(() => {
    if (!isSellerIdValid) {
      return undefined;
    }

    return {
      participantId: sellerIdNumber,
      ...(priceRange ? { priceRange } : {}),
    };
  }, [isSellerIdValid, priceRange, sellerIdNumber]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isProductsLoading,
    isError: isProductsError,
    refetch: refetchProducts,
  } = useProductsInfinite(PAGE_SIZE, filters, sortBy, {
    enabled: isSellerIdValid && Boolean(seller),
  });

  const products = useMemo(() => data?.pages.flat() ?? [], [data?.pages]);
  const availablePriceRange = useMemo(
    () => getAvailablePriceRange(products),
    [products],
  );

  const handleRetry = useCallback(() => {
    void refetchSeller();
    void refetchProducts();
  }, [refetchProducts, refetchSeller]);

  const handleProductsRetry = useCallback(() => {
    void refetchProducts();
  }, [refetchProducts]);

  const handleSortChange = (event: SelectChangeEvent<SortBy>) => {
    setSortBy(event.target.value as SortBy);
  };

  if (!isSellerIdValid) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 } }}>
        <ErrorState
          type="profile"
          title="Продавец не найден"
          description="В ссылке указан некорректный идентификатор продавца."
          hideRetry
          actions={
            <Button
              component={NextLink}
              href="/"
              variant="contained"
              startIcon={<ArrowBack />}
            >
              На главную
            </Button>
          }
        />
      </Container>
    );
  }

  if (isSellerError) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 } }}>
        <ErrorState
          type="profile"
          title="Не удалось загрузить продавца"
          description="Профиль продавца временно недоступен. Попробуйте обновить страницу."
          onRetry={handleRetry}
          retryText="Обновить"
        />
      </Container>
    );
  }

  if (!isSellerLoading && !seller) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 } }}>
        <ErrorState
          type="profile"
          title="Продавец не найден"
          description="Такого продавца нет или его публичный профиль недоступен."
          hideRetry
          actions={
            <Button
              component={NextLink}
              href="/"
              variant="contained"
              startIcon={<ArrowBack />}
            >
              На главную
            </Button>
          }
        />
      </Container>
    );
  }

  const renderProducts = () => {
    if (!isProductsLoading && !isProductsError && products.length === 0) {
      return (
        <EmptyCatalogState
          type="empty"
          title="У продавца нет активных товаров"
          description="Сейчас в публичном каталоге этого продавца нет доступных товаров."
          actionLabel="Обновить"
          onAction={handleProductsRetry}
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
          isLoading={isProductsLoading}
          isError={isProductsError}
          onRetry={handleProductsRetry}
        />
      </InfiniteScroll>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 } }}>
      <Breadcrumbs aria-label="Навигация" sx={{ mb: 2 }}>
        <MuiLink
          component={NextLink}
          href="/"
          color="inherit"
          underline="hover"
          fontSize="0.875rem"
        >
          Главная
        </MuiLink>
        <Typography color="text.secondary" fontSize="0.875rem">
          Продавцы
        </Typography>
        <Typography color="text.primary" fontSize="0.875rem" noWrap>
          {seller?.login ?? `#${sellerIdNumber}`}
        </Typography>
      </Breadcrumbs>

      {seller ? (
        <SellerProfileHeader seller={seller} />
      ) : (
        <SellerProfileHeaderSkeleton />
      )}

      <Box sx={{ mt: { xs: 3, sm: 4 } }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", md: "center" }}
          justifyContent="space-between"
          sx={{ mb: 2.5 }}
        >
          <Box>
            <Typography component="h2" variant="h4" fontWeight={700}>
              Товары продавца
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {products.length > 0
                ? `Показано товаров: ${products.length}`
                : "Список загрузится после получения профиля продавца"}
            </Typography>
          </Box>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            <PriceRangeFilter
              value={priceRange}
              availableRange={availablePriceRange}
              onApply={setPriceRange}
            />

            <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 190 } }}>
              <InputLabel id="seller-products-sort-label">Сортировка</InputLabel>
              <Select
                labelId="seller-products-sort-label"
                label="Сортировка"
                value={sortBy}
                onChange={handleSortChange}
                sx={{
                  borderRadius: 2,
                  bgcolor: "background.paper",
                }}
              >
                {SORT_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Stack>

        {renderProducts()}
      </Box>
    </Container>
  );
};
