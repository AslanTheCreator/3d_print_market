"use client";

import { Container } from "@mui/material";
import { useAuth } from "@/features/auth";
import { UnauthorizedState } from "@/shared/ui/states";
import Checkout from "@/widgets/checkout";

export default function CheckoutPage() {
  const { isAuthenticated } = useAuth();

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
