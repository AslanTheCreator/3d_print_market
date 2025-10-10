"use client";

import { Container, Typography, Box } from "@mui/material";
import { useAuth } from "@/features/auth";
import { UnauthorizedState } from "@/shared/ui/states";
import { CartContent } from "@/widgets/cart-content";

export default function CartPage() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <UnauthorizedState type="cart" />;
  }

  return (
    <Container sx={{ pt: "20px" }}>
      <Typography
        component="h1"
        variant="h2"
        sx={{
          mb: { xs: 2, sm: 3 },
          fontSize: { xs: "1.75rem", sm: "2rem" },
        }}
      >
        Корзина
      </Typography>
      <Box>
        <CartContent />
      </Box>
    </Container>
  );
}
