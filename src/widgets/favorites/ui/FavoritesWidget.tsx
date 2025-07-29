"use client";

import { useFavoritesProducts } from "@/entities/favorites/hooks";
import { ProductCatalog } from "@/widgets/product-catalog";
import { Typography, Box } from "@mui/material";

export const FavoritesWidget = () => {
  const {
    data: products = [],
    isLoading,
    error,
    refetch,
  } = useFavoritesProducts();

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
          error={error}
          onRetry={refetch}
        />
      </Box>
    </>
  );
};
