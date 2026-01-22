import React from "react";
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Paper,
} from "@mui/material";
import { UseFormReturn } from "react-hook-form";
import { CartProductModel } from "@/entities/cart";
import { CheckoutFormValues } from "../hooks/useCheckoutForm";
import { SellerOrderSection } from "./SellerOrderSection";
import { CheckoutOrderSummary } from "./CheckoutOrderSummary";
import { groupCartItemsBySeller } from "../lib/groupCartItems";
import { useOrderDataQueries } from "../hooks/useOrderDataQueries";
import { useCheckoutTotals } from "../hooks/useCheckoutTotals";
import { AddressSelector } from "@/entities/address";

type CheckoutDesktopViewProps = {
  cartItems: CartProductModel[];
  form: UseFormReturn<CheckoutFormValues>;
  checkoutState: any;
  isSubmitting: boolean;
  onSubmit: () => void;
};

export const CheckoutDesktopView: React.FC<CheckoutDesktopViewProps> = ({
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
    <Container maxWidth="xl" sx={{ my: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4 }}>
        Оформление заказа
      </Typography>

      <form onSubmit={onSubmit}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ mb: 3, p: 2 }}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Адрес доставки
                </Typography>
                <AddressSelector
                  selectedAddressId={checkoutState.selectedAddress?.id}
                  onAddressSelect={checkoutState.setSelectedAddress}
                  addresses={orderDataQueries[0]?.data?.addresses || []}
                  isLoading={orderDataQueries[0]?.isLoading || false}
                />
              </Box>
            </Paper>

            {sellerGroups.map((group) => {
              const orderQuery = orderDataQueries.find(
                (q) => q.sellerId === group.sellerId,
              );

              return (
                <Card key={group.sellerId} sx={{ mb: 3 }}>
                  <CardContent>
                    <SellerOrderSection
                      group={group}
                      control={form.control}
                      errors={form.formState.errors}
                      onTransferSelect={(transfer) =>
                        checkoutState.handleTransferSelect(
                          group.sellerId,
                          transfer,
                        )
                      }
                      transfers={orderQuery?.data?.sellerTransfers || []}
                      isLoading={orderQuery?.isLoading || false}
                      isError={orderQuery?.isError || false}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </Grid>

          <Grid item xs={12} md={4}>
            <CheckoutOrderSummary
              subtotal={subtotal}
              deliveryPrice={deliveryPrice}
              total={total}
              itemsCount={cartItems.length}
              isSubmitting={isSubmitting}
              onSubmit={onSubmit}
            />
          </Grid>
        </Grid>
      </form>
    </Container>
  );
};
