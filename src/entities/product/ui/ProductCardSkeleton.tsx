"use client";

import {
  Card,
  CardContent,
  Skeleton,
  Box,
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
        borderRadius: { xs: 2, sm: 2.5 },
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 2px 10px rgba(15, 23, 42, 0.04)",
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
          p: { xs: 1.25, sm: 1.5 },
          display: "flex",
          flexDirection: "column",
          gap: isMobile ? 1 : 1.25,
        }}
      >
        <Skeleton variant="text" width="52%" height={12} />
        <Skeleton variant="text" width="100%" height={18} />
        <Skeleton variant="text" width="82%" height={18} />
        <Skeleton variant="text" width="44%" height={20} />
        <Skeleton variant="rectangular" height={36} sx={{ borderRadius: 1 }} />
      </CardContent>
    </Card>
  );
};
