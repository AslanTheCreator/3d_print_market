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
import { SellerOrderSection } from "./SellerOrderSection";
import { groupCartItemsBySeller } from "../lib/groupCartItems";
import { useOrderDataQueries } from "../hooks/useOrderDataQueries";
import { useCheckoutTotals } from "../hooks/useCheckoutTotals";
import { formatPrice } from "@/shared/lib/utils/formatPrice";
import { AddressCheckoutSelector } from "@/features/address/select-address";

type CheckoutMobileViewProps = {
  cartItems: CartProductModel[];
  form: UseFormReturn<CheckoutFormValues>;
  checkoutState: any;
  isSubmitting: boolean;
  onSubmit: () => void;
};

export const CheckoutMobileView: React.FC<CheckoutMobileViewProps> = ({
  cartItems,
  form,
  checkoutState,
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
        {/* Упрощённый селектор адресов для checkout */}
        <AddressCheckoutSelector
          selectedAddressId={checkoutState.selectedAddress?.id}
          onAddressSelect={checkoutState.setSelectedAddress}
        />

        {sellerGroups.map((group, index) => {
          const orderQuery = orderDataQueries.find(
            (q) => q.sellerId === group.sellerId,
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
                />
              </Paper>
            </React.Fragment>
          );
        })}

        <Divider sx={{ my: 3 }} />

        {/* Итого */}
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mb: 1,
            }}
          >
            <Typography>Товары ({cartItems.length}):</Typography>
            <Typography fontWeight={500}>{formatPrice(subtotal)} ₽</Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mb: 1,
            }}
          >
            <Typography>Доставка:</Typography>
            <Typography fontWeight={500}>
              {formatPrice(deliveryPrice)} ₽
            </Typography>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="h6">Итого:</Typography>
            <Typography variant="h6" color="primary.main" fontWeight={700}>
              {formatPrice(total)} ₽
            </Typography>
          </Box>
        </Box>

        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={isSubmitting}
        >
          {isSubmitting ? "Оформление..." : "Оформить заказ"}
        </Button>
      </form>
    </Container>
  );
};
