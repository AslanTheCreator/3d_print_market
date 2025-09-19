"use client";

import React, { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Container,
  Typography,
  Grid,
  Box,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Skeleton,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Fab,
  Badge,
  Chip,
  alpha,
} from "@mui/material";
import {
  ShoppingCart,
  Add,
  FilterList,
  SortByAlpha,
  Refresh,
} from "@mui/icons-material";
import { formatPrice } from "@/shared/lib/format-price";
import {
  ProductCardModel,
  ProductFilter,
  SortBy,
} from "@/entities/product/model/types";
import {
  ProductCard,
  ProductCardSkeleton,
  useProductsInfinite,
} from "@/entities/product";
import { useRouter } from "next/navigation";
import { useProfileUser } from "@/entities/user";

interface UserProductCardProps {
  product: ProductCardModel;
  onAddToCart: (product: ProductCardModel) => void;
  isLoading: boolean;
}

// Компонент карточки товара пользователя (адаптированный под ваш дизайн)
const UserProductCard: React.FC<UserProductCardProps> = ({
  product,
  onAddToCart,
  isLoading,
}) => {
  const theme = useTheme();

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case "PURCHASABLE":
        return "success";
      case "PREORDER":
        return "warning";
      case "EXTERNAL_ONLY":
        return "info";
      default:
        return "default";
    }
  };

  const getAvailabilityText = (availability: string) => {
    switch (availability) {
      case "PURCHASABLE":
        return "В наличии";
      case "PREORDER":
        return "Предзаказ";
      case "EXTERNAL_ONLY":
        return "Внешний";
      default:
        return "Недоступно";
    }
  };

  {
    /* Бейдж доступности */
  }

  return (
    <Chip
      label={getAvailabilityText(product.availability)}
      color={getAvailabilityColor(product.availability)}
      size="small"
      sx={{
        position: "absolute",
        top: 8,
        right: 8,
        fontSize: "0.625rem",
        height: "20px",
        fontWeight: 600,
      }}
    />
  );
};

// Основной компонент страницы
export default function UserProductsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const router = useRouter();

  const [sortBy, setSortBy] = useState<SortBy>("DATE_DESC");

  const { data: user } = useProfileUser();
  // Фильтр для товаров пользователя
  const filters: ProductFilter = {
    participantId: user?.id,
  };

  // React Query для загрузки товаров
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useProductsInfinite(12, filters, sortBy);

  // Плоский массив всех товаров
  const products = data?.pages.flat() ?? [];

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleSortChange = useCallback((newSort: SortBy) => {
    setSortBy(newSort);
  }, []);

  // Состояние загрузки
  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 }, pb: 10 }}>
        <Typography
          variant={isMobile ? "h5" : "h4"}
          fontWeight={700}
          sx={{ mb: { xs: 2, sm: 3 } }}
        >
          Мои товары
        </Typography>
        <Grid container spacing={{ xs: 1, sm: 2, md: 2.5 }}>
          {Array.from({ length: 8 }).map((_, index) => (
            <Grid item xs={6} sm={4} md={3} key={index}>
              <ProductCardSkeleton />
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  // Состояние ошибки
  if (isError) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
        <Alert
          severity="error"
          sx={{ borderRadius: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              Повторить
            </Button>
          }
        >
          Ошибка загрузки товаров: {error?.message}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 }, pb: 12 }}>
      {/* Заголовок */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: { xs: 2, sm: 3 } }}
      >
        <Typography variant={isMobile ? "h5" : "h4"} fontWeight={700}>
          Мои товары
        </Typography>

        <Stack direction="row" spacing={1}>
          {!isMobile && (
            <>
              <Button
                variant="outlined"
                startIcon={<FilterList />}
                size="small"
                onClick={() => console.log("Открыть фильтры")}
              >
                Фильтры
              </Button>
              <Button
                variant="outlined"
                startIcon={<SortByAlpha />}
                size="small"
                onClick={() =>
                  handleSortChange(
                    sortBy === "DATE_DESC" ? "PRICE_ASC" : "DATE_DESC"
                  )
                }
              >
                Сортировка
              </Button>
            </>
          )}
          <Button
            variant="outlined"
            size="small"
            onClick={() => refetch()}
            disabled={isRefetching}
            startIcon={
              isRefetching ? <CircularProgress size={16} /> : <Refresh />
            }
          >
            {isRefetching ? "" : "Обновить"}
          </Button>
        </Stack>
      </Stack>

      {/* Статистика */}
      <Box
        sx={{
          mb: { xs: 2, sm: 3 },
          p: { xs: 1.5, sm: 2 },
          borderRadius: 2,
          bgcolor: "background.paper",
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Всего товаров: {products.length}
        </Typography>
      </Box>

      {/* Сетка товаров */}
      {products.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          У вас пока нет добавленных товаров. Начните продавать прямо сейчас!
        </Alert>
      ) : (
        <>
          <Grid container spacing={{ xs: 1, sm: 2, md: 2.5 }}>
            {products.map((product) => (
              <Grid item xs={6} sm={4} md={3} lg={2} key={product.id}>
                <ProductCard
                  {...product}
                  onCardClick={() =>
                    router.push(`/catalog/${product.id}/detail`)
                  }
                />
              </Grid>
            ))}
          </Grid>

          {/* Кнопка "Загрузить ещё" */}
          {hasNextPage && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
              <Button
                variant="outlined"
                onClick={handleLoadMore}
                disabled={isFetchingNextPage}
                size="large"
                sx={{ minWidth: 200 }}
              >
                {isFetchingNextPage ? (
                  <CircularProgress size={24} />
                ) : (
                  "Загрузить ещё"
                )}
              </Button>
            </Box>
          )}
        </>
      )}

      {/* Мобильные фильтры */}
      {isMobile && products.length > 0 && (
        <Stack
          direction="row"
          spacing={1}
          sx={{
            position: "fixed",
            bottom: 80,
            left: 16,
            right: 16,
            zIndex: 1000,
          }}
        >
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            size="small"
            sx={{ flex: 1, bgcolor: "background.paper" }}
            onClick={() => console.log("Открыть фильтры")}
          >
            Фильтры
          </Button>
          <Button
            variant="outlined"
            startIcon={<SortByAlpha />}
            size="small"
            sx={{ flex: 1, bgcolor: "background.paper" }}
            onClick={() =>
              handleSortChange(
                sortBy === "DATE_DESC" ? "PRICE_ASC" : "DATE_DESC"
              )
            }
          >
            Сортировка
          </Button>
        </Stack>
      )}

      {/* Кнопка добавить товар */}
      <Fab
        color="secondary"
        onClick={() => router.push("/dashboard/products/add")}
        sx={{
          position: "fixed",
          bottom: { xs: 80, sm: 100 },
          right: { xs: 16, sm: 24 },
          zIndex: 999,
        }}
      >
        <Add />
      </Fab>
    </Container>
  );
}
