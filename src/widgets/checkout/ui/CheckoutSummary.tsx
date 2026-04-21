"use client";

import React from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Divider,
  Skeleton,
  alpha,
  useTheme,
  CircularProgress,
  Collapse,
  Alert,
} from "@mui/material";
import { ShoppingCart, Warning } from "@mui/icons-material";
import { formatPrice } from "@/shared/lib";
import { ProductBasket, useCartQuantityStore } from "@/entities/cart";

interface CheckoutSummaryProps {
  cartItems: ProductBasket[];
  isReadyToSubmit: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
  hasFallbacks?: boolean;
  isLoading?: boolean;
}

export const CheckoutSummary: React.FC<CheckoutSummaryProps> = ({
  cartItems,
  isReadyToSubmit,
  isSubmitting,
  onSubmit,
  hasFallbacks = false,
  isLoading = false,
}) => {
  const theme = useTheme();

  // Подписываемся на items для реактивного обновления при изменении количества
  const items = useCartQuantityStore((state) => state.items);

  // Вычисляем итоги
  const { itemsCount, subtotal } = React.useMemo(() => {
    const quantitiesByProductId = new Map(
      items.map((item) => [item.productId, item.quantity]),
    );
    let total = 0;
    let totalItemsCount = 0;

    for (const item of cartItems) {
      const quantity = quantitiesByProductId.get(item.product.id) ?? 1;
      total += item.product.price * quantity;
      totalItemsCount += quantity;
    }

    return { itemsCount: totalItemsCount, subtotal: total };
  }, [cartItems, items]);

  // Плюрализация
  const getItemsWord = (count: number): string => {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
      return "товаров";
    }

    if (lastDigit === 1) {
      return "товар";
    }

    if (lastDigit >= 2 && lastDigit <= 4) {
      return "товара";
    }

    return "товаров";
  };

  if (isLoading) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 2,
          border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
        }}
      >
        <Skeleton variant="text" width="50%" height={32} />
        <Skeleton variant="text" width="100%" height={24} sx={{ mt: 2 }} />
        <Skeleton variant="text" width="100%" height={24} />
        <Skeleton
          variant="rectangular"
          height={48}
          sx={{ mt: 3, borderRadius: 2 }}
        />
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
        backgroundColor: theme.palette.background.paper,
        position: "sticky",
        top: 24,
      }}
    >
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Ваш заказ
      </Typography>

      <Box sx={{ mt: 2 }}>
        {/* Количество товаров */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
          }}
        >
          <Typography variant="body1" color="text.secondary">
            {itemsCount} {getItemsWord(itemsCount)}
          </Typography>
          <Typography variant="body1" fontWeight={500}>
            {formatPrice(subtotal)} ₽
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Итого */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          Итого
        </Typography>
        <Typography variant="h5" fontWeight={700} color="primary.main">
          {formatPrice(subtotal)} ₽
        </Typography>
      </Box>

      {/* Предупреждение о fallback */}
      <Collapse in={hasFallbacks}>
        <Alert
          severity="info"
          icon={<Warning sx={{ fontSize: 20 }} />}
          sx={{ mb: 2 }}
        >
          <Typography variant="body2">
            Для некоторых товаров способ доставки был изменён автоматически.
          </Typography>
        </Alert>
      </Collapse>

      {/* Кнопка оформления */}
      <Button
        variant="contained"
        color="primary"
        size="large"
        fullWidth
        disabled={!isReadyToSubmit || isSubmitting}
        onClick={onSubmit}
        startIcon={
          isSubmitting ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            <ShoppingCart />
          )
        }
        sx={{
          py: 1.5,
          fontSize: "1rem",
          fontWeight: 600,
          borderRadius: 2,
          textTransform: "none",
        }}
      >
        {isSubmitting ? "Оформляем заказы..." : "Оформить заказ"}
      </Button>

      {/* Подсказка если не готово */}
      {!isReadyToSubmit && !isSubmitting && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", textAlign: "center", mt: 1 }}
        >
          Выберите адрес и способ доставки
        </Typography>
      )}
    </Paper>
  );
};
