import React from "react";
import { Box, Grid, Paper, Skeleton, Stack } from "@mui/material";
import { AddressSelectorSkeleton } from "@/entities/address";

const panelSx = {
  p: { xs: 2, sm: 3 },
  borderRadius: 2,
  border: "1px solid",
  borderColor: "divider",
} as const;

const CheckoutCartItemSkeleton = () => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: { xs: "80px minmax(0, 1fr)", sm: "100px minmax(0, 1fr)" },
      gap: 1.5,
      pt: 1,
      pb: 2.5,
      borderBottom: "1px solid",
      borderColor: "divider",
    }}
  >
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ gridColumn: "1 / -1", height: 44 }}>
      <Skeleton variant="rounded" width={100} height={24} />
      <Skeleton variant="circular" width={24} height={24} />
    </Stack>
    <Skeleton
      variant="rounded"
      sx={{
        width: { xs: 80, sm: 100 },
        height: { xs: 80, sm: 100 },
        flexShrink: 0,
        borderRadius: 1.5,
      }}
    />
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Stack direction="row" justifyContent="space-between" spacing={1}>
        <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
          <Skeleton variant="text" width="36%" height={14} />
          <Skeleton variant="text" width="84%" height={22} />
          <Skeleton variant="text" width="48%" height={18} />
        </Stack>
      </Stack>
    </Box>
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ gridColumn: "1 / -1" }}>
      <Skeleton variant="text" width={104} height={44} />
      <Skeleton variant="rounded" width={128} height={44} />
    </Stack>
  </Box>
);

export const CheckoutSkeleton = () => (
  <Box aria-busy="true">
    <Skeleton
      variant="text"
      width={260}
      height={48}
      sx={{ mb: { xs: 2, sm: 4 } }}
    />

    <Grid container spacing={3}>
      <Grid item xs={12} lg={8}>
        <Stack spacing={3}>
          <Paper elevation={0} sx={panelSx}>
            <Skeleton variant="text" width={180} height={32} sx={{ mb: 2 }} />
            <AddressSelectorSkeleton showRadio />
          </Paper>

          <Paper elevation={0} sx={{ ...panelSx, p: { xs: 0, md: 3 }, border: { xs: "none", md: "1px solid" }, borderColor: "divider", bgcolor: { xs: "transparent", md: "background.paper" } }}>
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{ pb: 1, mb: 2 }}
            >
              <Skeleton variant="rounded" width={44} height={44} />
              <Stack sx={{ flex: 1 }}>
                <Skeleton variant="text" width={190} height={28} />
                <Skeleton variant="text" width={120} height={20} />
              </Stack>
            </Stack>

            <Paper
              variant="outlined"
              sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2 }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                gap={1}
                flexWrap="wrap"
                sx={{ pb: 1.5 }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Skeleton variant="circular" width={24} height={24} />
                  <Box>
                    <Skeleton variant="text" width={120} height={24} />
                    <Skeleton variant="text" width={72} height={18} />
                  </Box>
                </Stack>
                <Skeleton variant="text" width={104} height={20} />
              </Stack>

              <Skeleton variant="rectangular" height={1} />
              <CheckoutCartItemSkeleton />
              <CheckoutCartItemSkeleton />

              <Box sx={{ pt: 2 }}>
                <Skeleton variant="rounded" height={72} sx={{ borderRadius: 2 }} />
              </Box>
            </Paper>
          </Paper>

          <Paper elevation={0} sx={panelSx}>
            <Skeleton variant="text" width={220} height={32} sx={{ mb: 2 }} />
            <Skeleton variant="rounded" height={96} sx={{ borderRadius: 2 }} />
          </Paper>
        </Stack>
      </Grid>

      <Grid item xs={12} lg={4}>
        <Paper
          elevation={0}
          sx={{
            ...panelSx,
            position: "sticky",
            top: "calc(var(--shell-sticky-top) + 24px)",
          }}
        >
          <Skeleton variant="text" width={140} height={32} />
          <Stack spacing={1} sx={{ mt: 2 }}>
            <Skeleton variant="text" height={24} />
            <Skeleton variant="text" height={24} />
          </Stack>
          <Skeleton variant="rectangular" height={1} sx={{ my: 2 }} />
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 3 }}>
            <Skeleton variant="text" width={72} height={32} />
            <Skeleton variant="text" width={110} height={36} />
          </Stack>
          <Skeleton variant="rounded" height={48} sx={{ borderRadius: 2 }} />
        </Paper>
      </Grid>
    </Grid>
  </Box>
);
