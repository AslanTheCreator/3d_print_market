"use client";

import React, { useState } from "react";
import { Container, Typography, Box, CircularProgress } from "@mui/material";
import { useRouter } from "next/navigation";
import { useCartProducts } from "@/entities/cart";
import { useCheckoutState } from "../hooks/useCheckoutState";
import { useCheckoutSubmit } from "../hooks/useCheckoutSubmit";
import { CheckoutResultDialog } from "./CheckoutResultDialog";
import { CheckoutContent } from "./CheckoutContent";
import { EmptyCartState } from "@/shared/ui/states";
import { OrderSuccessState } from "@/shared/ui/states";
import { CheckoutResult } from "../model/types";

const Checkout = () => {
  const router = useRouter();

  const { data: cartItems, isLoading: isCartLoading } = useCartProducts();

  const checkoutState = useCheckoutState({ cartItems });

  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [lastResult, setLastResult] = useState<CheckoutResult | null>(null);

  const { handleSubmit, retryFailed, isSubmitting, submitResult, clearResult } =
    useCheckoutSubmit({
      cartItems: checkoutState.selectedItems,
      checkoutState,
      onSuccess: (result: CheckoutResult) => {
        setResultDialogOpen(true);
        setOrderCompleted(true);
        setLastResult(result);
      },
      onPartialSuccess: (result: CheckoutResult) => {
        setResultDialogOpen(true);
        setLastResult(result);
      },
      onError: (result: CheckoutResult) => {
        setResultDialogOpen(true);
        setLastResult(result);
      },
    });

  // Закрытие диалога — принудительная навигация при полном успехе
  const handleCloseResultDialog = () => {
    setResultDialogOpen(false);
    clearResult();

    if (lastResult?.successCount === lastResult?.totalCount) {
      router.push("/dashboard/purchase");
    }
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

  // После успешного оформления — показываем OrderSuccessState вместо пустой корзины
  if (cartItems.length === 0 && orderCompleted) {
    return (
      <OrderSuccessState
        orderCount={lastResult?.successCount}
        onGoToOrders={handleGoToOrders}
        onGoHome={handleGoHome}
      />
    );
  }

  // Пустая корзина (пользователь зашёл сам, без оформления)
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

        <CheckoutContent
          cartItems={cartItems}
          checkoutState={checkoutState}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        />
      </Container>

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
