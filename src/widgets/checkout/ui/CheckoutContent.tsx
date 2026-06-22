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
import { CheckoutState } from "../model/useCheckoutState";
import { CheckoutCartSection } from "./CheckoutCartSection";
import { CheckoutSummary } from "./CheckoutSummary";
import { AddressCheckoutSelector } from "./AddressCheckoutSelector";

interface CheckoutContentProps {
  checkoutState: CheckoutState;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export const CheckoutContent: React.FC<CheckoutContentProps> = ({
  checkoutState,
  isSubmitting,
  onSubmit,
}) => {
  const theme = useTheme();

  return (
    <Grid container spacing={3}>
      {/* Левая колонка - основной контент */}
      <Grid item xs={12} lg={8}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Адрес доставки */}
          <AddressCheckoutSelector
            addresses={checkoutState.addresses}
            isLoading={checkoutState.isLoadingAddresses}
            isError={checkoutState.isAddressesError}
            selectedAddressId={checkoutState.selectedAddress?.id}
            onAddressSelect={checkoutState.setSelectedAddress}
            onRetry={() => void checkoutState.refetchAddresses()}
          />

          {/* Товары сгруппированы по продавцам вместе с их доставкой */}
          <CheckoutCartSection
            sellerGroups={checkoutState.sellerGroups}
            selectedProductIds={checkoutState.selectedProductIds}
            isAllSelected={checkoutState.isAllSelected}
            selectedCount={checkoutState.selectedCount}
            onToggleProductSelection={checkoutState.toggleProductSelection}
            onToggleSelectAll={checkoutState.toggleSelectAll}
            onTransferSelect={checkoutState.selectTransfer}
            onRetryDelivery={checkoutState.retrySellerDelivery}
          />

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
              placeholder="Добавьте комментарий к заказу (необязательно)"
              value={checkoutState.comment}
              onChange={(e) => checkoutState.setComment(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                },
              }}
            />
          </Paper>
        </Box>
      </Grid>

      {/* Правая колонка - итоги */}
      <Grid item xs={12} lg={4}>
        <CheckoutSummary
          cartItems={checkoutState.selectedItems}
          sellerDeliveries={checkoutState.selectedSellerDeliveries}
          isReadyToSubmit={checkoutState.isReadyToSubmit}
          isSubmitting={isSubmitting}
          onSubmit={onSubmit}
        />
      </Grid>
    </Grid>
  );
};
