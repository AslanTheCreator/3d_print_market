import React from "react";
import { Box, Card, CardContent, Skeleton, Stack } from "@mui/material";

export const UserProductCardSkeleton: React.FC = () => (
  <Card
    sx={{
      width: "100%",
      borderRadius: { xs: 1.5, sm: 2 },
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
      overflow: "hidden",
      position: "relative",
      display: "flex",
      flexDirection: "column",
      height: "100%",
    }}
  >
    <Box sx={{ position: "relative", width: "100%", aspectRatio: "1/1.2" }}>
      <Skeleton variant="rectangular" width="100%" height="100%" />
      <Skeleton
        variant="rounded"
        width={76}
        height={20}
        sx={{ position: "absolute", top: 8, left: 8 }}
      />
      <Skeleton
        variant="circular"
        width={34}
        height={34}
        sx={{ position: "absolute", top: 8, right: 8 }}
      />
    </Box>

    <CardContent
      sx={{
        p: { xs: "8px", sm: "12px" },
        "&:last-child": { pb: { xs: 1.5, sm: 2 } },
        flexGrow: 1,
      }}
    >
      <Stack spacing={0.5}>
        <Skeleton variant="text" width="48%" height={12} />
        <Skeleton variant="text" width="82%" height={18} />
        <Skeleton variant="text" width="48%" height={24} />
        <Skeleton variant="text" width="58%" height={16} />
        <Skeleton variant="text" width="66%" height={18} />
        <Skeleton variant="rounded" width={70} height={18} />
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Skeleton variant="circular" width={14} height={14} />
          <Skeleton variant="rounded" width={92} height={20} />
        </Stack>
      </Stack>
    </CardContent>
  </Card>
);
