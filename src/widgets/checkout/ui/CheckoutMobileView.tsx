import React from "react";
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Divider,
} from "@mui/material";
import { UseFormReturn } from "react-hook-form";
import { CartProductModel } from "@/entities/cart";
import { CheckoutFormValues } from "../hooks/useCheckoutForm";
import { CheckoutAddressSection } from "./CheckoutAddressSection";
import { SellerOrderSection } from "./SellerOrderSection";
import { groupCartItemsBySeller } from "../lib/groupCartItems";
import { useOrderDataQueries } from "../hooks/useOrderDataQueries";
import { useCheckoutTotals } from "../hooks/useCheckoutTotals";
import { formatPrice } from "@/shared/lib/format-price";

type CheckoutMobileViewProps = {
  cartItems: CartProductModel[];
  form: UseFormReturn<CheckoutFormValues>;
  checkoutState: any;
  addressDialog: any;
  isSubmitting: boolean;
  onSubmit: () => void;
};

export const CheckoutMobileView: React.FC<CheckoutMobileViewProps> = ({
  cartItems,
  form,
  checkoutState,
  addressDialog,
  isSubmitting,
  onSubmit,
}) => {
  const sellerGroups = groupCartItemsBySeller(cartItems);
  const orderDataQueries = useOrderDataQueries(sellerGroups);
  const { subtotal, deliveryPrice, total } = useCheckoutTotals(cartItems);

  return (
    <Container maxWidth="sm" sx={{ my: 4 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Оформление заказа
      </Typography>

      <form onSubmit={onSubmit}>
        <CheckoutAddressSection
          selectedAddressId={checkoutState.selectedAddress?.id}
          onAddressSelect={checkoutState.setSelectedAddress}
          onAddNewAddress={addressDialog.openDialog}
          addresses={orderDataQueries[0]?.data?.addresses || []}
          isLoading={orderDataQueries[0]?.isLoading || false}
          isMobile
        />

        {sellerGroups.map((group, index) => {
          const orderQuery = orderDataQueries.find(
            (q) => q.sellerId === group.sellerId
          );

          return (
            <React.Fragment key={group.sellerId}>
              <Paper sx={{ mb: 3, p: 2 }}>
                <SellerOrderSection
                  group={group}
                  control={form.control}
                  errors={form.formState.errors}
                  onTransferSelect={(transfer) =>
                    checkoutState.handleTransferSelect(group.sellerId, transfer)
                  }
                  transfers={orderQuery?.data?.sellerTransfers || []}
                  isLoading={orderQuery?.isLoading || false}
                  isError={orderQuery?.isError || false}
                  isMobile
                />
              </Paper>

              {index < sellerGroups.length - 1 && (
                <Divider sx={{ my: 4, borderWidth: 2 }} />
              )}
            </React.Fragment>
          );
        })}

        <Paper sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Ваш заказ
          </Typography>
          <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography>Товары ({cartItems.length}):</Typography>
            <Typography>{formatPrice(subtotal)} ₽</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography>Доставка:</Typography>
            <Typography>
              {deliveryPrice === 0
                ? "Бесплатно"
                : `${formatPrice(deliveryPrice)} ₽`}
            </Typography>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Box display="flex" justifyContent="space-between">
            <Typography variant="h6">Итого:</Typography>
            <Typography variant="h6">{formatPrice(total)} ₽</Typography>
          </Box>
        </Paper>

        <Button
          type="submit"
          variant="contained"
          color="primary"
          size="large"
          fullWidth
          disabled={isSubmitting}
          sx={{ mb: 4 }}
        >
          {isSubmitting ? "Оформление..." : "Подтвердить заказ"}
        </Button>
      </form>
    </Container>
  );
};
