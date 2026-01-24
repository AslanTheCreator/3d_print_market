"use client";

import React from "react";
import {
  Box,
  Grid,
  TextField,
  Paper,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import { CartProductModel } from "@/entities/cart";
import { CheckoutState } from "../hooks/useCheckoutState";
import { CheckoutCartSection } from "./CheckoutCartSection";
import { DeliveryMethodSelector } from "./DeliveryMethodSelector";
import { CheckoutSummary } from "./CheckoutSummary";
import { AddressCheckoutSelector } from "@/features/address/select-address";

interface CheckoutContentProps {
  cartItems: CartProductModel[];
  checkoutState: CheckoutState;
  isSubmitting: boolean;
  onSubmit: () => void;
  isMobile: boolean;
}

export const CheckoutContent: React.FC<CheckoutContentProps> = ({
  cartItems,
  checkoutState,
  isSubmitting,
  onSubmit,
  isMobile,
}) => {
  const theme = useTheme();

  return (
    <Grid container spacing={3}>
      {/* Левая колонка - основной контент */}
      <Grid item xs={12} lg={8}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Адрес доставки */}
          <AddressCheckoutSelector
            selectedAddressId={checkoutState.selectedAddress?.id}
            onAddressSelect={checkoutState.setSelectedAddress}
          />

          {/* Способ доставки */}
          <DeliveryMethodSelector
            availableMethods={checkoutState.availableDeliveryMethods}
            selectedMethod={checkoutState.selectedDeliveryMethod}
            onMethodSelect={checkoutState.setSelectedDeliveryMethod}
            isLoading={checkoutState.isLoadingDelivery}
            isError={checkoutState.isDeliveryError}
            fallbackMessages={checkoutState.deliveryResolution.fallbackMessages}
            hasFallbacks={checkoutState.deliveryResolution.hasFallbacks}
          />

          {/* Корзина с товарами */}
          <CheckoutCartSection items={cartItems} />

          {/* Комментарий к заказу */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
              backgroundColor: theme.palette.background.paper,
            }}
          >
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Комментарий к заказу
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Укажите дополнительную информацию для продавца (необязательно)"
              value={checkoutState.comment}
              onChange={(e) => checkoutState.setComment(e.target.value)}
              variant="outlined"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                },
              }}
            />
          </Paper>
        </Box>
      </Grid>

      {/* Правая колонка - итого (на десктопе) */}
      <Grid item xs={12} lg={4}>
        <Box
          sx={{
            position: { lg: "sticky" },
            top: { lg: 24 },
          }}
        >
          <CheckoutSummary
            cartItems={cartItems}
            isReadyToSubmit={checkoutState.isReadyToSubmit}
            isSubmitting={isSubmitting}
            onSubmit={onSubmit}
            hasFallbacks={checkoutState.deliveryResolution.hasFallbacks}
            isLoading={checkoutState.isLoadingDelivery}
          />
        </Box>
      </Grid>
    </Grid>
  );
};
