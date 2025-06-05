import React from "react";
import { Box, Grid, useMediaQuery, useTheme } from "@mui/material";
import { ProductCardModel } from "@/entities/product/model/types";
import { useCartProducts } from "@/entities/cart";
import { ProductCardSkeleton } from "@/entities/product";
import { ProductCardWithActions } from "./ProductCardWithActions";

interface ProductCatalogProps {
  products: ProductCardModel[];
  isLoading?: boolean;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  isLoading,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const skeletonCount = isMobile ? 6 : 12;

  if (isLoading) {
    return (
      <Box>
        <Grid
          container
          spacing={{ xs: 1, sm: 2, md: 3 }}
          sx={{
            margin: isMobile ? "-4px" : undefined,
            width: isMobile ? "calc(100% + 8px)" : "100%",
          }}
        >
          {Array.from({ length: skeletonCount }).map((_, index) => (
            <Grid item xs={6} sm={4} md={3} lg={2.4} key={index}>
              <ProductCardSkeleton />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      <Grid
        container
        spacing={{ xs: 1, sm: 2, md: 3 }}
        sx={{
          margin: isMobile ? "-4px" : undefined,
          width: isMobile ? "calc(100% + 8px)" : "100%",
        }}
      >
        {products.map((product) => {
          return (
            <Grid
              item
              xs={6}
              sm={4}
              md={3}
              lg={2.4}
              key={product.id}
              sx={{
                padding: isMobile ? "4px" : undefined,
              }}
            >
              <ProductCardWithActions product={product} />
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};
