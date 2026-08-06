"use client";

import { Box, Card, CardContent, Skeleton, Stack } from "@mui/material";
import React from "react";

export const ProductCardSkeleton: React.FC = () => {
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
          position: "relative",
          width: "100%",
          aspectRatio: { xs: "1/1.2", sm: "1/1.33" },
        }}
      >
        <Skeleton
          variant="rectangular"
          width="100%"
          height="100%"
          animation="wave"
        />
        <Skeleton
          variant="circular"
          width={44}
          height={44}
          sx={{
            position: "absolute",
            top: { xs: 4, sm: 10 },
            right: { xs: 4, sm: 10 },
          }}
        />
      </Box>

      <CardContent
        sx={{
          p: { xs: 1.25, sm: 1.5 },
          "&:last-child": { pb: { xs: 1.5, sm: 1.75 } },
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <Stack spacing={0.75}>
          <Skeleton variant="text" width="52%" height={12} />
          <Skeleton variant="text" width="82%" height={18} />
        </Stack>

        <Stack spacing={0.5} sx={{ mt: 0.75 }}>
          <Skeleton variant="text" width="48%" height={24} />
          <Skeleton variant="text" width="58%" height={16} />
          <Skeleton variant="text" width="66%" height={18} />
        </Stack>
      </CardContent>

      <Box sx={{ px: { xs: 1.25, sm: 1.5 }, pb: { xs: 1.5, sm: 1.75 } }}>
        <Skeleton
          variant="rounded"
          height={44}
          sx={{ borderRadius: { xs: 1, sm: 1.5 } }}
        />
      </Box>
    </Card>
  );
};
