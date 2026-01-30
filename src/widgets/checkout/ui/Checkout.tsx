"use client";

import React, { useState } from "react";
import {
  Container,
  Typography,
  Button,
  useTheme,
  useMediaQuery,
  Box,
  CircularProgress,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useCartProducts } from "@/entities/cart";
import { useCheckoutState } from "../hooks/useCheckoutState";
import { useCheckoutSubmit } from "../hooks/useCheckoutSubmit";
import { CheckoutResultDialog } from "./CheckoutResultDialog";
import { CheckoutContent } from "./CheckoutContent";
import { EmptyCartState } from "@/shared/ui/states";
import { CheckoutResult } from "../model/types";

const Checkout = () => {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { data: cartItems, isLoading: isCartLoading } = useCartProducts();

  const checkoutState = useCheckoutState({ cartItems });

  const [resultDialogOpen, setResultDialogOpen] = useState(false);

  // Передаём только ВЫБРАННЫЕ товары в useCheckoutSubmit
  const { handleSubmit, retryFailed, isSubmitting, submitResult, clearResult } =
    useCheckoutSubmit({
      cartItems: checkoutState.selectedItems,
      checkoutState,
      onSuccess: (result: CheckoutResult) => {
        setResultDialogOpen(true);
      },
      onPartialSuccess: (result: CheckoutResult) => {
        setResultDialogOpen(true);
      },
      onError: (result: CheckoutResult) => {
        setResultDialogOpen(true);
      },
    });

  const handleCloseResultDialog = () => {
    setResultDialogOpen(false);
    clearResult();
  };

  const handleGoHome = () => {
    setResultDialogOpen(false);
    router.push("/");
  };

  const handleGoToOrders = () => {
    setResultDialogOpen(false);
    router.push("/dashboard/purchase");
  };

  // Загрузка
  if (isCartLoading || cartItems === undefined) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 400,
            gap: 2,
          }}
        >
          <CircularProgress size={48} />
        </Box>
      </Container>
    );
  }

  // Пустая корзина
  if (cartItems.length === 0) {
    return <EmptyCartState />;
  }

  return (
    <>
      <Container
        maxWidth="lg"
        sx={{
          py: { xs: 2, sm: 4 },
          px: { xs: 2, sm: 3 },
        }}
      >
        {/* Заголовок */}
        <Typography
          variant="h4"
          component="h1"
          fontWeight={700}
          sx={{
            mb: { xs: 2, sm: 4 },
            fontSize: { xs: "1.5rem", sm: "2rem" },
          }}
        >
          Оформление заказа
        </Typography>

        {/* Основной контент */}
        <CheckoutContent
          cartItems={cartItems}
          checkoutState={checkoutState}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        />
      </Container>

      {/* Диалог результатов */}
      <CheckoutResultDialog
        open={resultDialogOpen}
        result={submitResult}
        onClose={handleCloseResultDialog}
        onRetry={retryFailed}
        onGoHome={handleGoHome}
        onGoToOrders={handleGoToOrders}
        isRetrying={isSubmitting}
      />
    </>
  );
};

export default Checkout;
