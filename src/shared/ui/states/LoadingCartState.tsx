import React from "react";
import { Container, Stack, Typography } from "@mui/material";
import { CartItemSkeleton } from "../skeletons/CartItemSkeleton";

export const LoadingCartState: React.FC = () => {
  return (
    <Container sx={{ marginTop: "10px" }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Корзина
      </Typography>
      <Stack>
        {Array.from({ length: 3 }).map((_, index) => (
          <CartItemSkeleton key={index} />
        ))}
      </Stack>
    </Container>
  );
};
