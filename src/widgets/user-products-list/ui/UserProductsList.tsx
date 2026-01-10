"use client";

import React, { useCallback } from "react";
import {
  Grid,
  Box,
  Button,
  CircularProgress,
  Alert,
  useTheme,
  Typography,
  Stack,
  Chip,
  Paper,
} from "@mui/material";
import { Refresh, TrendingUp, Inventory } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import {
  ProductCard,
  ProductCardSkeleton,
  useUserProductsInfinite,
} from "@/entities/product";
import { ProductFilter, SortBy } from "@/entities/product/model/types";
import { FavoriteButton } from "@/features/toggle-favorite";
import { AddToCartButton } from "@/features/cart";
import { useFavoritesChecks } from "@/entities/favorites/hooks";
import { EmptyCatalogState } from "@/shared/ui/states";

interface UserProductsListProps {
  participantId?: number;
}

export const UserProductsList: React.FC<UserProductsListProps> = ({
  participantId,
}) => {
  const theme = useTheme();
  const router = useRouter();

  const { isProductInFavorites } = useFavoritesChecks();

  const [sortBy] = React.useState<SortBy>("DATE_DESC");

  const filters: ProductFilter = participantId ? { participantId } : {};

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
  } = useUserProductsInfinite(12, filters, sortBy);

  const products = data?.pages.flat() ?? [];

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleCardClick = (productId: number) => {
    router.push(`/catalog/${productId}/detail`);
  };

  // Loading state
  if (isLoading) {
    return (
      <Box>
        <Grid container spacing={{ xs: 1, sm: 2, md: 2.5 }}>
          {Array.from({ length: 12 }).map((_, index) => (
            <Grid item xs={6} sm={4} md={3} lg={2} key={index}>
              <ProductCardSkeleton />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  // Error state
  if (isError) {
    return (
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
    );
  }

  // Empty state
  if (products.length === 0) {
    return (
      <EmptyCatalogState
        type="empty"
        title="У вас пока нет товаров"
        description="Начните продавать, создав свой первый товар. Это просто и быстро!"
        actionLabel="Создать товар"
        onAction={() => router.push("/dashboard/products/new")}
      />
    );
  }

  return (
    <Box>
      {/* Statistics */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.background.paper,
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Stack direction="row" spacing={3} alignItems="center">
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Inventory color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  {products.length}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Товаров
              </Typography>
            </Box>

            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <TrendingUp color="success" />
                <Typography variant="h6" fontWeight={600}>
                  {
                    products.filter((p) => p.availability === "PURCHASABLE")
                      .length
                  }
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                В наличии
              </Typography>
            </Box>

            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <TrendingUp color="warning" />
                <Typography variant="h6" fontWeight={600}>
                  {products.filter((p) => p.availability === "PREORDER").length}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Предзаказ
              </Typography>
            </Box>
          </Stack>

          <Button
            variant="outlined"
            size="small"
            onClick={() => refetch()}
            disabled={isRefetching}
            startIcon={
              isRefetching ? <CircularProgress size={16} /> : <Refresh />
            }
          >
            Обновить
          </Button>
        </Stack>
      </Paper>

      {/* Products Grid */}
      <Grid container spacing={{ xs: 1, sm: 2, md: 2.5 }}>
        {products.map((product) => (
          <Grid item xs={6} sm={4} md={3} lg={2} key={product.id}>
            <Box sx={{ position: "relative" }}>
              <ProductCard
                {...product}
                onCardClick={() => handleCardClick(product.id)}
                actions={
                  <AddToCartButton
                    productId={product.id}
                    availability={product.availability}
                    productName={product.name}
                  />
                }
              />
              <FavoriteButton
                productId={product.id}
                isFavorite={isProductInFavorites(product.id)}
                productName={product.name}
              />

              {/* Status Badge */}
              <Chip
                label={
                  product.availability === "PURCHASABLE"
                    ? "В наличии"
                    : product.availability === "PREORDER"
                    ? "Предзаказ"
                    : "Внешний"
                }
                color={
                  product.availability === "PURCHASABLE"
                    ? "success"
                    : product.availability === "PREORDER"
                    ? "warning"
                    : "info"
                }
                size="small"
                sx={{
                  position: "absolute",
                  top: 8,
                  left: 8,
                  fontSize: "0.625rem",
                  height: "20px",
                  fontWeight: 600,
                  zIndex: 1,
                }}
              />
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Load More Button */}
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
    </Box>
  );
};
