"use client";

import React from "react";
import Card from "./ProductCard";
import { Box, Grid } from "@mui/material";
import { CardItem } from "../model/types";

interface ProductListProps {
  products: CardItem[];
  ref?: (node?: Element | null | undefined) => void;
}

const ProductList: React.FC<ProductListProps> = ({ products, ref }) => {
  return (
    <Box>
      <Grid container spacing={{ xs: "12px", sm: 3 }}>
        {products.map((card, index) => (
          <Grid
            item
            xs={6}
            sm={3}
            lg={2}
            key={card.id}
            ref={index === products.length - 1 ? ref : undefined}
          >
            <Card {...card} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ProductList;
