import React from "react";
import { Typography } from "@mui/material";

interface ProductDescriptionProps {
  description: string;
}

export const ProductDescription: React.FC<ProductDescriptionProps> = ({
  description,
}) => (
  <Typography variant="body2" sx={{ color: "text.secondary" }}>
    {description || "Описание товара отсутствует"}
  </Typography>
);
