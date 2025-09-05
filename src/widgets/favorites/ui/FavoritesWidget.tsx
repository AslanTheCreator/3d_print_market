"use client";

import { useFavoritesProducts } from "@/entities/favorites/hooks";
import { useAuth } from "@/features/auth";
import { UnauthorizedState } from "@/shared/ui";
import { ProductCatalog } from "@/widgets/product-catalog";
import { Typography, Box } from "@mui/material";

export const FavoritesWidget = () => {
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
    <>
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
          onRetry={refetch}
        />
      </Box>
    </>
  );
};
