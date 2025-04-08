import React from "react";
import { Box, Grid, useMediaQuery, useTheme } from "@mui/material";
import { ProductCardModel } from "../model/types";
import { ProductCard } from "./ProductCard";
import { ProductCardSkeleton } from "./ProductCard";

interface ProductListProps {
  products: ProductCardModel[];
  ref?: (node?: Element | null | undefined) => void;
  isLoading?: boolean;
}

export const ProductList: React.FC<ProductListProps> = ({
  products,
  ref,
  isLoading,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const skeletonCount = isMobile ? 6 : 12;

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
        {isLoading
          ? Array.from({ length: skeletonCount }).map((_, index) => (
              <Grid item xs={6} sm={4} md={3} lg={2.4} key={index}>
                <ProductCardSkeleton />
              </Grid>
            ))
          : products.map((product, index) => (
              <Grid
                item
                xs={6}
                sm={4}
                md={3}
                lg={2.4}
                key={product.id}
                ref={index === products.length - 1 ? ref : undefined}
                sx={{
                  padding: isMobile ? "4px" : undefined,
                }}
              >
                <ProductCard {...product} />
              </Grid>
            ))}
      </Grid>
    </Box>
  );
};
