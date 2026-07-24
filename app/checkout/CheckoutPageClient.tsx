"use client";

import { Box, CircularProgress, Container } from "@mui/material";
import { useAuth } from "@/entities/session";
import { UnauthorizedState } from "@/shared/ui/states";
import Checkout from "@/widgets/checkout";

export default function CheckoutPageClient() {
  const { isAuthenticated, isInitialized } = useAuth();

  if (!isInitialized) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 2, sm: 3 } }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 400,
          }}
        >
          <CircularProgress size={40} />
        </Box>
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
