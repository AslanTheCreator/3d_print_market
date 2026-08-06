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
      display: "flex",
      alignItems: "flex-start",
      gap: { xs: 1.5, sm: 2 },
      py: { xs: 2, sm: 2.5 },
      px: { xs: 1, sm: 1.5 },
      mx: { xs: -1, sm: -1.5 },
      borderBottom: "1px solid",
      borderColor: "divider",
    }}
  >
    <Skeleton
      variant="rounded"
      width={24}
      height={24}
      sx={{ mt: 0.5, flexShrink: 0 }}
    />
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
        <Skeleton variant="circular" width={34} height={34} />
      </Stack>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={1.5}
        sx={{ mt: { xs: 1.5, sm: 2 } }}
      >
        <Skeleton variant="text" width={104} height={30} />
        <Skeleton variant="rounded" width={120} height={40} />
      </Stack>
    </Box>
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

          <Paper elevation={0} sx={panelSx}>
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{ pb: 2, mb: 2, borderBottom: "1px solid", borderColor: "divider" }}
            >
              <Skeleton variant="rounded" width={24} height={24} />
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
                spacing={2}
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
                <Skeleton
                  variant="text"
                  width={190}
                  height={28}
                  sx={{ mb: 1.5 }}
                />
                <Stack spacing={1}>
                  {[1, 2].map((item) => (
                    <Skeleton
                      key={item}
                      variant="rounded"
                      height={64}
                      sx={{ borderRadius: 2 }}
                    />
                  ))}
                </Stack>
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
        <Paper elevation={0} sx={{ ...panelSx, position: "sticky", top: 24 }}>
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
