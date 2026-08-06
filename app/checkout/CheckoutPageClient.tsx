"use client";

import { Container } from "@mui/material";
import { useAuth } from "@/entities/session";
import { UnauthorizedState } from "@/shared/ui/states";
import Checkout, { CheckoutSkeleton } from "@/widgets/checkout";

export default function CheckoutPageClient() {
  const { isAuthenticated, isInitialized } = useAuth();

  if (!isInitialized) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 2, sm: 3 } }}>
        <CheckoutSkeleton />
      </Container>
    );
  }

  if (!isAuthenticated) {
    return <UnauthorizedState type="checkout" />;
  }

  return (
    <Container
      maxWidth="lg"
      sx={{ py: { xs: 2, sm: 4 }, px: { xs: 2, sm: 3 } }}
    >
      <Checkout />
    </Container>
  );
}
