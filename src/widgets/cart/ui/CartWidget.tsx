"use client";

import { Container, Typography, Box } from "@mui/material";
import { useRouter } from "next/navigation";

import {
  CartList,
  CartSummary,
  useCartChecks,
  useCartProducts,
} from "@/entities/cart";
import { useAuth } from "@/features/auth";
import {
  EmptyCartState,
  ErrorState,
  LoadingCartState,
  UnauthorizedState,
} from "@/shared/ui";
import { useCartItemRemoval } from "@/features/cart";

export const CartWidget = () => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const {
    data: cartItems,
    isLoading,
    isError,
    refetch,
  } = useCartProducts({ enabled: isAuthenticated });

  const { getCartTotal, getCartItemsCount } = useCartChecks(cartItems);
  const { handleRemoveItem, removingItemIds } = useCartItemRemoval();

  const handleCheckout = () => router.push("/checkout");

  if (!isAuthenticated) {
    return <UnauthorizedState type="cart" />;
  }

  if (isLoading) {
    return <LoadingCartState />;
  }

  if (isError) {
    return <ErrorState onRetry={() => refetch()} type="cart" />;
  }

  if (!cartItems?.length) {
    return <EmptyCartState />;
  }

  return (
    <Container
      maxWidth="lg"
      sx={{
        marginTop: "10px",
        pb: 4,
        px: { xs: 2, sm: 3, md: 4 },
      }}
    >
      <Typography
        variant="h5"
        component="h1"
        gutterBottom
        fontWeight={700}
        sx={{ mb: { xs: 2, md: 3 } }}
      >
        Корзина
      </Typography>

      <Box
        sx={{
          display: { xs: "block", lg: "grid" },
          gridTemplateColumns: { lg: "2fr 1fr" },
          gap: { lg: 4 },
          alignItems: "start",
        }}
      >
        {/* Cart Items */}
        <Box sx={{ mb: { xs: 3, lg: 0 } }}>
          <CartList
            items={cartItems}
            onRemoveItem={handleRemoveItem}
            removingItemIds={removingItemIds}
          />
        </Box>

        {/* Summary Panel */}
        <Box sx={{ position: { lg: "sticky" }, top: { lg: 24 } }}>
          <CartSummary
            itemsCount={getCartItemsCount}
            total={getCartTotal}
            onCheckout={handleCheckout}
          />
        </Box>
      </Box>
    </Container>
  );
};
