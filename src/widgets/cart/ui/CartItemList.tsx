"use client";

import React from "react";
import { Button, Container, Typography } from "@mui/material";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { CartList, useCartProducts } from "@/entities/cart";
import { useRouter } from "next/navigation";
import EmptyCart from "@/entities/cart/ui/EmptyCart";

const CartItemList = () => {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const {
    data: cartItems,
    isLoading: cartLoading,
    isError,
  } = useCartProducts({ token });

  const isLoading = authLoading || cartLoading;

  if (isLoading) {
    return (
      <Container sx={{ marginTop: "10px", textAlign: "center" }}>
        <Typography>Загрузка...</Typography>
      </Container>
    );
  }

  if (isError || !cartItems?.length) {
    return <EmptyCart />;
  }

  return (
    <Container sx={{ marginTop: "10px" }}>
      <CartList items={cartItems} />
      <Button
        variant="contained"
        color="primary"
        size="large"
        fullWidth
        onClick={() => router.push("/checkout")}
        sx={{ mb: 4 }}
      >
        Оформить заказ
      </Button>
    </Container>
  );
};

export default CartItemList;
