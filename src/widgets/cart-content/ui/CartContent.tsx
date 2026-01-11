// Возможно убрать этот файл если не нужен

"use client";

import { Container, Box } from "@mui/material";
import { useRouter } from "next/navigation";
import {
  CartItemsList,
  CartSummary,
  useCartChecks,
  useCartProducts,
} from "@/entities/cart";
import { useRemoveFromCartFeature } from "@/features/cart";
import {
  EmptyCartState,
  ErrorState,
  LoadingCartState,
} from "@/shared/ui/states";

export const CartContent = () => {
  const router = useRouter();
  const { data: cartItems, isLoading, isError, refetch } = useCartProducts();
  const { getCartTotal, getCartItemsCount } = useCartChecks();
  const { handleRemoveItem, removingItemIds } = useRemoveFromCartFeature();

  const handleCheckout = () => router.push("/checkout");

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
      <Box
        sx={{
          display: { xs: "block", lg: "grid" },
          gridTemplateColumns: { lg: "2fr 1fr" },
          gap: { lg: 4 },
          alignItems: "start",
        }}
      >
        <Box sx={{ mb: { xs: 3, lg: 0 } }}>
          <CartItemsList
            items={cartItems}
            onRemoveItem={handleRemoveItem}
            removingItemIds={removingItemIds}
          />
        </Box>

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
