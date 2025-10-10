"use client";

import { Container, Typography, Box } from "@mui/material";
import { useFavoritesProducts } from "@/entities/favorites/hooks";
import { useAuth } from "@/features/auth";
import { UnauthorizedState } from "@/shared/ui/states";
import { ProductCatalog } from "@/widgets/product-catalog";

export default function FavoritesPage() {
  const { isAuthenticated } = useAuth();

  const {
    data: products = [],
    isLoading,
    isError,
    refetch,
  } = useFavoritesProducts();

  if (!isAuthenticated) {
    return <UnauthorizedState type="favorites" />;
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
        Избранное
      </Typography>
      <Box>
        <ProductCatalog
          products={products}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
        />
      </Box>
    </Container>
  );
}
