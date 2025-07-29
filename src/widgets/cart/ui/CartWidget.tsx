"use client";

import React from "react";
import {
  alpha,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { CartList, useCartChecks, useCartProducts } from "@/entities/cart";
import { useRouter } from "next/navigation";
import {
  ButtonStyled,
  EmptyCartState,
  ErrorCartState,
  LoadingCartState,
} from "@/shared/ui";
import { formatPrice } from "@/shared/lib";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { UnauthorizedCartState } from "@/shared/ui/states/UnauthorizedCartState";

export const CartWidget = () => {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { isAuthenticated } = useAuth();

  const {
    data: cartItems,
    isLoading,
    isError,
    error,
    refetch,
  } = useCartProducts({ enabled: isAuthenticated });

  const { getCartTotal, getCartItemsCount } = useCartChecks(cartItems);

  if (!isAuthenticated) {
    return <UnauthorizedCartState />;
  }

  if (isLoading) {
    return <LoadingCartState />;
  }

  if (isError) {
    return (
      <ErrorCartState
        onRetry={() => refetch()}
        error={error instanceof Error ? error.message : "Неизвестная ошибка"}
      />
    );
  }

  if (!cartItems?.length) {
    return <EmptyCartState />;
  }

  const total = getCartTotal;

  return (
    <Container sx={{ marginTop: "10px", pb: 4 }}>
      <Typography variant="h5" component="h1" gutterBottom fontWeight={700}>
        Корзина
      </Typography>
      <Stack spacing={3}>
        <CartList items={cartItems} />

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: { xs: 1.5, sm: 2 },
            border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
            bgcolor: alpha(theme.palette.primary.main, 0.02),
          }}
        >
          <Stack spacing={2}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography
                variant={isMobile ? "subtitle1" : "h6"}
                fontWeight={600}
                color="text.secondary"
              >
                Товаров: {getCartItemsCount}
              </Typography>

              <Typography
                variant={isMobile ? "h6" : "h5"}
                fontWeight={700}
                color="primary.main"
              >
                {formatPrice(total)} ₽
              </Typography>
            </Stack>

            <Divider />

            <ButtonStyled
              variant="contained"
              color="primary"
              size="large"
              fullWidth
              onClick={() => router.push("/checkout")}
              sx={{
                py: isMobile ? 1.5 : 2,
                fontSize: isMobile ? "1rem" : "1.125rem",
                fontWeight: 600,
              }}
            >
              Оформить заказ
            </ButtonStyled>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
};
