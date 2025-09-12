"use client";
import React from "react";
import { Box, Container, Typography, Skeleton, Stack } from "@mui/material";

interface LoadingStateProps {
  title: string;
  itemsCount?: number;
}

const OrderCardSkeleton = () => (
  <Box sx={{ mb: 2, p: 2, border: 1, borderColor: "divider", borderRadius: 2 }}>
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      sx={{ mb: 2 }}
    >
      <Skeleton variant="text" width="40%" height={32} />
      <Skeleton
        variant="rectangular"
        width={120}
        height={24}
        sx={{ borderRadius: 1 }}
      />
    </Stack>
    <Skeleton
      variant="rectangular"
      width="100%"
      height={60}
      sx={{ mb: 2, borderRadius: 1 }}
    />
    <Skeleton
      variant="rectangular"
      width="100%"
      height={80}
      sx={{ mb: 2, borderRadius: 1 }}
    />
    <Skeleton
      variant="rectangular"
      width="100%"
      height={120}
      sx={{ mb: 2, borderRadius: 1 }}
    />
    <Stack direction="row" spacing={1}>
      <Skeleton
        variant="rectangular"
        width={120}
        height={32}
        sx={{ borderRadius: 1 }}
      />
      <Skeleton
        variant="rectangular"
        width={120}
        height={32}
        sx={{ borderRadius: 1 }}
      />
    </Stack>
  </Box>
);

export const LoadingState: React.FC<LoadingStateProps> = ({
  title,
  itemsCount = 3,
}) => {
  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      <Typography variant="h4" gutterBottom>
        {title}
      </Typography>
      {[...Array(itemsCount)].map((_, index) => (
        <OrderCardSkeleton key={index} />
      ))}
    </Container>
  );
};
