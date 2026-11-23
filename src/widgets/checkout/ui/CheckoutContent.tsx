"use client";

import React from "react";
import {
  Box,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  MenuItem,
  Radio,
  RadioGroup,
  TextField,
  Paper,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import { deliveryCarrierLabels, type DeliveryCarrier } from "@/entities/order";
import { CheckoutState } from "../model/useCheckoutState";
import { CheckoutCartSection } from "./CheckoutCartSection";
import { CheckoutSummary } from "./CheckoutSummary";
import { AddressCheckoutSelector } from "./AddressCheckoutSelector";

interface CheckoutContentProps {
  checkoutState: CheckoutState;
  isSubmitting: boolean;
  onSubmit: () => void;
  onRetryStockValidation: () => void;
}

export const CheckoutContent: React.FC<CheckoutContentProps> = ({
  checkoutState,
  isSubmitting,
  onSubmit,
  onRetryStockValidation,
}) => {
  const theme = useTheme();
  const commentLabelId = React.useId();
  const deliveryLabelId = React.useId();
  const carrierId = React.useId();
  const addressId = React.useId();
  const usesCarrier = checkoutState.deliveryMode === "carrier";

  return (
    <Grid container spacing={3}>
      {/* Левая колонка - основной контент */}
      <Grid item xs={12} lg={8}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <FormControl component="fieldset" disabled={isSubmitting}>
            <FormLabel component="legend" id={deliveryLabelId}>Способ оформления доставки</FormLabel>
            <RadioGroup
              aria-labelledby={deliveryLabelId}
              value={checkoutState.deliveryMode}
              onChange={(_, value) => checkoutState.setDeliveryMode(value === "carrier" ? "carrier" : "legacy")}
            >
              <FormControlLabel value="legacy" control={<Radio />} label="Сохранённый адрес и доставка продавца" sx={{ minHeight: 44 }} />
              <FormControlLabel value="carrier" control={<Radio />} label="Служба доставки и новый адрес" sx={{ minHeight: 44 }} />
            </RadioGroup>
          </FormControl>
          {usesCarrier && (
            <>
              <TextField
                id={carrierId}
                select
                required
                fullWidth
                label="Служба доставки"
                value={checkoutState.deliveryCarrier}
                onChange={(event) => checkoutState.setDeliveryCarrier(event.target.value as DeliveryCarrier)}
                error={checkoutState.deliveryErrors.carrier !== null}
                helperText={checkoutState.deliveryErrors.carrier}
                disabled={isSubmitting}
              >
                {Object.entries(deliveryCarrierLabels).map(([code, label]) => (
                  <MenuItem key={code} value={code} sx={{ minHeight: 44 }}>{label}</MenuItem>
                ))}
              </TextField>
              <TextField
                id={addressId}
                required
                fullWidth
                multiline
                minRows={2}
                maxRows={5}
                label="Адрес доставки или ПВЗ"
                value={checkoutState.deliveryAddress}
                onChange={(event) => checkoutState.setDeliveryAddress(event.target.value)}
                error={checkoutState.deliveryErrors.address !== null}
                helperText={checkoutState.deliveryErrors.address ?? `${checkoutState.deliveryAddress.length} из 2000 символов`}
                disabled={isSubmitting}
                sx={{ "& textarea": { overflowWrap: "anywhere" } }}
              />
            </>
          )}
          <div hidden={usesCarrier}>
            <AddressCheckoutSelector
              addresses={checkoutState.addresses}
              isLoading={checkoutState.isLoadingAddresses}
              isError={checkoutState.isAddressesError}
              selectedAddressId={checkoutState.selectedAddress?.id}
              onAddressSelect={checkoutState.setSelectedAddress}
              onRetry={() => void checkoutState.refetchAddresses()}
              addressCreation={checkoutState.addressCreation}
              isSubmitting={isSubmitting}
            />
          </div>

          {/* Товары сгруппированы по продавцам вместе с их доставкой */}
          <CheckoutCartSection
            showSellerDelivery={!usesCarrier}
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
            <Typography
              id={commentLabelId}
              variant="h6"
              fontWeight={600}
              gutterBottom
            >
              Комментарий к заказу
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Добавьте комментарий к заказу (необязательно)"
              value={checkoutState.comment}
              onChange={(e) => checkoutState.setComment(e.target.value)}
              inputProps={{
                "aria-labelledby": commentLabelId,
              }}
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
          cartItems={checkoutState.orderableSelectedItems}
          sellerDeliveries={usesCarrier ? [] : checkoutState.selectedSellerDeliveries}
          hasUnknownDeliveryCost={usesCarrier}
          hasIncompleteDelivery={!usesCarrier && checkoutState.sellerGroups.some(
            (group) => group.isActive && (group.isLoading || group.isError || !group.selectedTransfer),
          )}
          isReadyToSubmit={checkoutState.isReadyToSubmit}
          submitBlockerMessage={checkoutState.submitBlockerMessage}
          isSubmitting={isSubmitting}
          onSubmit={onSubmit}
          showStockValidationRetry={checkoutState.canRetryStockValidation}
          onRetryStockValidation={onRetryStockValidation}
        />
      </Grid>
    </Grid>
  );
};
