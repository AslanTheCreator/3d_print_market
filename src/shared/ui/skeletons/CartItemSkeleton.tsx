import React from "react";
import {
  Paper,
  Skeleton,
  Stack,
  useTheme,
  alpha,
} from "@mui/material";

export const CartItemSkeleton: React.FC = () => {
  const theme = useTheme();

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
          <Skeleton variant="text" width={80} sx={{ height: { xs: 16, sm: 18 } }} />
          <Skeleton variant="text" width="90%" sx={{ height: { xs: 20, sm: 24 } }} />
          <Skeleton variant="text" width="60%" sx={{ height: { xs: 20, sm: 24 } }} />
          <Skeleton
            variant="text"
            width={100}
            sx={{ mt: 0.5, height: { xs: 18, sm: 20 } }}
          />
        </Stack>
      </Stack>

      <Skeleton variant="rectangular" height={1} sx={{ mb: 1.5 }} />

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Skeleton
          variant="rectangular"
          sx={{
            width: { xs: 32, sm: 40 },
            height: { xs: 32, sm: 40 },
            borderRadius: "8px",
          }}
        />

        <Stack direction="row" alignItems="center" spacing={1}>
          <Skeleton
            variant="rectangular"
            sx={{
              width: { xs: 30, sm: 36 },
              height: { xs: 30, sm: 36 },
              borderRadius: "8px",
            }}
          />
          <Skeleton
            variant="text"
            sx={{
              width: { xs: 24, sm: 28 },
              height: { xs: 20, sm: 24 },
            }}
          />
          <Skeleton
            variant="rectangular"
            sx={{
              width: { xs: 30, sm: 36 },
              height: { xs: 30, sm: 36 },
              borderRadius: "8px",
            }}
          />
        </Stack>
      </Stack>
    </Paper>
  );
};
