import React from "react";
import { Box, Typography, Paper } from "@mui/material";
import { formatPrice } from "@/shared/lib/formatPrice";

interface ProductPriceProps {
  price: number;
}

export const ProductPrice: React.FC<ProductPriceProps> = ({ price }) => (
  <Paper
    elevation={0}
    sx={{
      borderRadius: "20px",
      p: "12px 20px",
      display: "flex",
      flexDirection: "column",
    }}
  >
    <Typography
      fontWeight={700}
      fontSize={{ xs: 21, sm: 25 }}
      lineHeight={1.1}
      color="primary.secondary"
    >
      {formatPrice(price) + " ₽"}
    </Typography>
  </Paper>
);
