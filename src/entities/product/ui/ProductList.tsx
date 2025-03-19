import React from "react";
import Card from "./ProductCard";
import { Box, Grid, useMediaQuery, useTheme } from "@mui/material";
import { CardItem } from "../model/types";

interface ProductListProps {
  products: CardItem[];
  ref?: (node?: Element | null | undefined) => void;
}

const ProductList: React.FC<ProductListProps> = ({ products, ref }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

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
        {products.map((product, index) => (
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
            <Card {...product} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ProductList;
