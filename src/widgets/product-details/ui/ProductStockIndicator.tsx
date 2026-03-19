"use client";

import { Inventory2Outlined } from "@mui/icons-material";
import { Stack, Typography, TypographyProps } from "@mui/material";
import { getStockColor } from "./productDetailsFormatters";

interface ProductStockIndicatorProps {
  stockCount: number | null;
  label: string;
  iconSize: number;
  textVariant: TypographyProps["variant"];
}

export function ProductStockIndicator({
  stockCount,
  label,
  iconSize,
  textVariant,
}: ProductStockIndicatorProps) {
  const stockColor = getStockColor(stockCount);

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Inventory2Outlined sx={{ fontSize: iconSize }} color={stockColor} />
      <Typography
        variant={textVariant}
        fontWeight={600}
        color={`${stockColor}.main`}
      >
        {label}
      </Typography>
    </Stack>
  );
}
