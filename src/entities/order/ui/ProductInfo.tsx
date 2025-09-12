"use client";
import React from "react";
import { Stack, Box, Typography } from "@mui/material";
import { ShoppingCart } from "@mui/icons-material";
import { ListOrdersModel } from "@/entities/order";

interface ProductInfoProps {
  product: ListOrdersModel["product"];
}

export const ProductInfo = ({ product }: ProductInfoProps) => (
  <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
    <Box
      sx={{
        width: { xs: 60, sm: 80 },
        height: { xs: 60, sm: 80 },
        bgcolor: "grey.100",
        borderRadius: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ShoppingCart color="action" />
    </Box>
    <Box flex={1}>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        {product.name}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Категория: {product.categories[0].name}
      </Typography>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 0.5, sm: 2 }}
        alignItems={{ xs: "flex-start", sm: "center" }}
      >
        <Typography variant="body2">
          Количество: <strong>{product.count}</strong>
        </Typography>
        <Typography variant="body2" color="primary.main" fontWeight={600}>
          {product.price} {product.currency}
        </Typography>
      </Stack>
    </Box>
  </Stack>
);
