"use client";

import React from "react";
import {
  Container,
  Typography,
  Button,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useCartProducts } from "@/entities/cart";
import { useCheckoutForm } from "../hooks/useCheckoutForm";
import { useCheckoutSubmit } from "../hooks/useCheckoutSubmit";
import { CheckoutMobileView } from "./CheckoutMobileView";
import { CheckoutDesktopView } from "./CheckoutDesktopView";
import { CheckoutNotifications } from "./CheckoutNotifications";
import { AddressDialog } from "@/features/address/create-address/ui/AddressDialog";
import { useAddressDialog } from "@/features/address/create-address/hooks/useAddressDialog";
import { useCheckoutState } from "../hooks/useCheckoutState";

const Checkout = () => {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { data: cartItems, isLoading: isCartLoading } = useCartProducts();

  const checkoutState = useCheckoutState();
  const form = useCheckoutForm();
  const { handleSubmit, isSubmitting } = useCheckoutSubmit({
    cartItems,
    selectedAddress: checkoutState.selectedAddress,
    selectedTransfers: checkoutState.selectedTransfers,
    onSuccess: () => {
      checkoutState.showNotification("Все заказы успешно созданы!", "success");
      form.reset();
      setTimeout(() => router.push("/checkout/success"), 2000);
    },
    onPartialSuccess: (successCount, totalCount) => {
      checkoutState.showNotification(
        `Создано ${successCount} из ${totalCount} заказов`,
        "warning"
      );
    },
    onError: () => {
      checkoutState.showNotification(
        "Не удалось создать ни одного заказа",
        "error"
      );
    },
  });

  const addressDialog = useAddressDialog(() => {
    checkoutState.showNotification("Адрес успешно добавлен!", "success");
  });

  if (isCartLoading) {
    return (
      <Container sx={{ my: 4, textAlign: "center" }}>
        <Typography variant="h5" gutterBottom>
          Загрузка корзины...
        </Typography>
      </Container>
    );
  }

  if (!cartItems?.length) {
    return (
      <Container sx={{ my: 4, textAlign: "center" }}>
        <Typography variant="h5" gutterBottom>
          Ваша корзина пуста
        </Typography>
        <Button variant="contained" onClick={() => router.push("/")}>
          Вернуться к покупкам
        </Button>
      </Container>
    );
  }

  const commonProps = {
    cartItems,
    form,
    checkoutState,
    addressDialog,
    isSubmitting,
    onSubmit: form.handleSubmit(handleSubmit),
  };

  return (
    <>
      {isMobile ? (
        <CheckoutMobileView {...commonProps} />
      ) : (
        <CheckoutDesktopView {...commonProps} />
      )}

      <AddressDialog
        open={addressDialog.isOpen}
        onClose={addressDialog.closeDialog}
        onSuccess={addressDialog.handleSuccess}
      />

      <CheckoutNotifications
        open={checkoutState.notification.open}
        message={checkoutState.notification.message}
        severity={checkoutState.notification.severity}
        onClose={checkoutState.hideNotification}
      />
    </>
  );
};

export default Checkout;
