"use client";

import { Inventory2Outlined } from "@mui/icons-material";
import { Box, Stack, Typography } from "@mui/material";
import { getStockColor } from "./productDetailsFormatters";

interface ProductStockIndicatorProps {
  stockCount: number | null;
  label: string;
  compactLabel: string;
}

export function ProductStockIndicator({
  stockCount,
  label,
  compactLabel,
}: ProductStockIndicatorProps) {
  const stockColor = getStockColor(stockCount);

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Inventory2Outlined
        sx={{ fontSize: { xs: 16, sm: 20 } }}
        color={stockColor}
      />
      <Typography
        variant="body2"
        fontWeight={600}
        color={`${stockColor}.main`}
        sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
      >
        <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
          {compactLabel}
        </Box>
        <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
          {label}
        </Box>
      </Typography>
    </Stack>
  );
}
