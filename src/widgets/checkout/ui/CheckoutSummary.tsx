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
} from "@mui/material";
import { ShoppingCart } from "@mui/icons-material";
import { formatPrice } from "@/shared/lib";
import type { Currency } from "@/shared/types";
import { ProductBasket, useCartQuantityStore } from "@/entities/cart";
import { calculateCheckoutTotals } from "../model/checkoutTotals";
import type { SelectedSellerDelivery } from "../model/types";

interface CheckoutSummaryProps {
  cartItems: ProductBasket[];
  sellerDeliveries: SelectedSellerDelivery[];
  isReadyToSubmit: boolean;
  submitBlockerMessage: string | null;
  isSubmitting: boolean;
  onSubmit: () => void;
  isLoading?: boolean;
}

export const CheckoutSummary: React.FC<CheckoutSummaryProps> = ({
  cartItems,
  sellerDeliveries,
  isReadyToSubmit,
  submitBlockerMessage,
  isSubmitting,
  onSubmit,
  isLoading = false,
}) => {
  const theme = useTheme();
  const deliveryTransfers = React.useMemo(
    () => sellerDeliveries.map((delivery) => delivery.transfer),
    [sellerDeliveries],
  );

  // Подписываемся на items для реактивного обновления при изменении количества
  const items = useCartQuantityStore((state) => state.items);

  // Вычисляем итоги
  const { itemsCount, productTotals, deliveryTotals, orderTotals } =
    React.useMemo(
      () =>
        calculateCheckoutTotals({
          cartItems,
          quantityItems: items,
          deliveryTransfers,
        }),
      [cartItems, deliveryTransfers, items],
    );

  const formattedProductTotal = formatCurrencyTotals(productTotals, "0 ₽");
  const formattedDeliveryTotal =
    deliveryTransfers.length > 0 &&
    [...deliveryTotals.values()].every((total) => total === 0)
      ? "Бесплатно"
      : formatCurrencyTotals(deliveryTotals, "—");
  const formattedOrderTotal = formatCurrencyTotals(orderTotals, "0 ₽");

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
            {formattedProductTotal}
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="body1" color="text.secondary">
            Доставка
          </Typography>
          <Typography variant="body1" fontWeight={500}>
            {formattedDeliveryTotal}
          </Typography>
        </Box>

        {sellerDeliveries.map((delivery) => (
          <Box
            key={delivery.sellerId}
            data-testid={`checkout-summary-delivery-${delivery.sellerId}`}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 2,
              mt: 0.5,
              pl: 1.5,
            }}
          >
            <Typography variant="caption" color="text.secondary" noWrap>
              {delivery.sellerLogin}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {delivery.transfer.price === 0
                ? "Бесплатно"
                : formatPrice(
                    delivery.transfer.price,
                    delivery.transfer.currency,
                  )}
            </Typography>
          </Box>
        ))}
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
        <Typography variant="h5" fontWeight={700} color="text.primary">
          {formattedOrderTotal}
        </Typography>
      </Box>

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
      {submitBlockerMessage && !isSubmitting && (
        <Typography
          data-testid="checkout-submit-blocker"
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", textAlign: "center", mt: 1 }}
        >
          {submitBlockerMessage}
        </Typography>
      )}
    </Paper>
  );
};

function formatCurrencyTotals(
  totals: ReadonlyMap<Currency, number>,
  emptyValue: string,
): string {
  if (totals.size === 0) {
    return emptyValue;
  }

  return [...totals.entries()]
    .map(([currency, total]) => formatPrice(total, currency))
    .join(" + ");
}
