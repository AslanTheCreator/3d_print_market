"use client";

import {
  Card,
  CardContent,
  Skeleton,
  Box,
  Stack,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import React from "react";

export const ProductCardSkeleton: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Card
      sx={{
        width: "100%",
        borderRadius: { xs: 1.5, sm: 2 },
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <Box
        sx={{
          width: "100%",
          aspectRatio: isMobile ? "1/1.2" : "1/1.33",
        }}
      >
        <Skeleton
          variant="rectangular"
          width="100%"
          height="100%"
          animation="wave"
        />
      </Box>

      <CardContent
        sx={{
          p: { xs: "8px", sm: "12px" },
          display: "flex",
          flexDirection: "column",
          gap: isMobile ? 1 : 1.5,
        }}
      >
        <Skeleton variant="text" width="60%" height={12} />
        <Skeleton variant="text" width="100%" height={18} />
        <Skeleton variant="text" width="40%" height={20} />
        <Skeleton variant="rectangular" height={36} sx={{ borderRadius: 1 }} />
      </CardContent>
    </Card>
  );
};
