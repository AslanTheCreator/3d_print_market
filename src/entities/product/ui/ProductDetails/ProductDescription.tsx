"use client";

import { Typography, Box } from "@mui/material";
import { memo } from "react";

interface ProductDescriptionProps {
  description: string;
}

export const ProductDescription = memo<ProductDescriptionProps>(
  ({ description }) => {
    if (!description) {
      return (
        <Typography variant="body2" color="text.secondary">
          Описание товара отсутствует
        </Typography>
      );
    }

    return (
      <Box>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            lineHeight: 1.6,
            whiteSpace: "pre-line",
          }}
        >
          {description}
        </Typography>
      </Box>
    );
  }
);

ProductDescription.displayName = "ProductDescription";
