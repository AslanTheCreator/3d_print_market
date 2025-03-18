"use client";

import React from "react";
import { Container, Typography } from "@mui/material";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { CartList, useCartProducts } from "@/entities/cart";
import EmptyCart from "@/features/cart";

const CartItemList = () => {
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
    </Container>
  );
};

export default CartItemList;
