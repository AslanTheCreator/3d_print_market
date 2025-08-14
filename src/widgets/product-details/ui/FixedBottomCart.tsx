"use client";

import { Paper } from "@mui/material";
import { AddToCartButton } from "@/features/cart";
import { Availability } from "@/entities/product/model/types";

interface FixedBottomCartProps {
  productId: number;
  availability: Availability;
}

export function FixedBottomCart({
  productId,
  availability,
}: FixedBottomCartProps) {
  return (
    <Paper
      elevation={2}
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100%",
        zIndex: 10,
        borderRadius: "20px 20px 0 0",
        p: "12px",
        boxShadow: "0px -2px 10px rgba(0, 0, 0, 0.1)",
      }}
    >
      <AddToCartButton
        productId={productId}
        availability={availability}
        variant="detailed"
      />
    </Paper>
  );
}
