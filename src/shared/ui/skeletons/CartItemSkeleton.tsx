import React from "react";
import {
  Paper,
  Skeleton,
  Stack,
  useTheme,
  useMediaQuery,
  alpha,
} from "@mui/material";

export const CartItemSkeleton: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.5, sm: 2 },
        mb: 2,
        borderRadius: { xs: 1.5, sm: 2 },
        border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
      }}
    >
      <Stack direction="row" spacing={2} pb={1.5}>
        <Skeleton
          variant="rectangular"
          sx={{
            width: { xs: 100, sm: 120 },
            height: { xs: 100, sm: 120 },
            borderRadius: 1.5,
            flexShrink: 0,
          }}
        />

        <Stack flexGrow={1} spacing={0.5} justifyContent="flex-start">
          <Skeleton variant="text" width={80} height={isMobile ? 16 : 18} />
          <Skeleton variant="text" width="90%" height={isMobile ? 20 : 24} />
          <Skeleton variant="text" width="60%" height={isMobile ? 20 : 24} />
          <Skeleton
            variant="text"
            width={100}
            height={isMobile ? 18 : 20}
            sx={{ mt: 0.5 }}
          />
        </Stack>
      </Stack>

      <Skeleton variant="rectangular" height={1} sx={{ mb: 1.5 }} />

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Skeleton
          variant="rectangular"
          width={isMobile ? 32 : 40}
          height={isMobile ? 32 : 40}
          sx={{ borderRadius: "8px" }}
        />

        <Stack direction="row" alignItems="center" spacing={1}>
          <Skeleton
            variant="rectangular"
            width={isMobile ? 30 : 36}
            height={isMobile ? 30 : 36}
            sx={{ borderRadius: "8px" }}
          />
          <Skeleton
            variant="text"
            width={isMobile ? 24 : 28}
            height={isMobile ? 20 : 24}
          />
          <Skeleton
            variant="rectangular"
            width={isMobile ? 30 : 36}
            height={isMobile ? 30 : 36}
            sx={{ borderRadius: "8px" }}
          />
        </Stack>
      </Stack>
    </Paper>
  );
};
