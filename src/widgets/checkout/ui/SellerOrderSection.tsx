import React from "react";
import { Box, Typography, Grid, Paper } from "@mui/material";
import { Controller, Control, FieldErrors } from "react-hook-form";
import { CartItemsList } from "@/entities/cart";
import { TransferSelector } from "@/features/transfer/transfer-selector/TransferSelector";
import { TextField } from "@mui/material";
import { SellerGroup } from "../lib/groupCartItems";
import { CheckoutFormValues } from "../hooks/useCheckoutForm";
import { TransferBaseModel } from "@/entities/transfer/model/types";
import { useRemoveFromCartFeature } from "@/features/cart";

type SellerOrderSectionProps = {
  group: SellerGroup;
  control: Control<CheckoutFormValues>;
  errors: FieldErrors<CheckoutFormValues>;
  onTransferSelect: (transfer: TransferBaseModel | null) => void;
  transfers: TransferBaseModel[];
  isLoading: boolean;
  isError: boolean;
  isMobile?: boolean;
};

export const SellerOrderSection: React.FC<SellerOrderSectionProps> = ({
  group,
  control,
  errors,
  onTransferSelect,
  transfers,
  isLoading,
  isError,
  isMobile = false,
}) => {
  const { handleRemoveItem, removingItemIds } = useRemoveFromCartFeature();

  const renderContent = () => (
    <>
      <Grid item xs={12}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          Товары
        </Typography>
        <CartItemsList
          items={group.items}
          onRemoveItem={handleRemoveItem}
          removingItemIds={removingItemIds}
        />
      </Grid>

      <Grid item xs={12} sm={isMobile ? 12 : 6}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          Способ получения
        </Typography>
        <TransferSelector
          control={control}
          name={`deliveryMethod_${group.sellerId}`}
          error={errors[`deliveryMethod_${group.sellerId}`] as any}
          onTransferSelect={onTransferSelect}
          showDescriptions={true}
          hideUnavailable={true}
          transfers={transfers}
          isError={isError}
          isLoading={isLoading}
        />
      </Grid>

      <Grid item xs={12} sm={isMobile ? 12 : 6}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          Комментарий к заказу
        </Typography>
        <Controller
          name={`comment.${group.sellerId}`}
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              multiline
              rows={4}
              placeholder="Дополнительная информация для продавца"
              variant="outlined"
            />
          )}
        />
      </Grid>
    </>
  );

  if (isMobile) {
    return (
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h6"
          component="h2"
          gutterBottom
          sx={{
            mb: 2,
            p: 2,
            backgroundColor: "primary.main",
            color: "primary.contrastText",
            borderRadius: 1,
          }}
        >
          {group.sellerName}
        </Typography>
        <Grid container spacing={2}>
          {renderContent()}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          mb: 3,
          p: 2,
          backgroundColor: "primary.main",
          color: "primary.contrastText",
          borderRadius: 1,
          mx: -2,
          mt: -2,
        }}
      >
        <Typography variant="h6" component="h2">
          {group.sellerName}
        </Typography>
      </Box>
      <Grid container spacing={3}>
        {renderContent()}
      </Grid>
    </Box>
  );
};
