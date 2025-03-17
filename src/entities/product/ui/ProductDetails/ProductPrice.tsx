import React from "react";
import { Box, Typography } from "@mui/material";
import { formatPrice } from "@/shared/lib/formatPrice";

interface ProductPriceProps {
  price?: number;
}

const ProductPrice: React.FC<ProductPriceProps> = ({ price }) => (
  <Box bgcolor={"white"} borderRadius={"20px"} p={"8px 16px 8px 16px"}>
    <Typography fontWeight={700} fontSize={27}>
      {formatPrice(price)}
    </Typography>
  </Box>
);

export default ProductPrice;
