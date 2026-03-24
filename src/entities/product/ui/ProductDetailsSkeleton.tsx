"use client";

import {
  Container,
  Grid,
  Skeleton,
  Stack,
  Box,
  Paper,
  useTheme,
  useMediaQuery,
} from "@mui/material";

export function ProductDetailsSkeleton() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  if (isMobile) {
    return <MobileProductDetailsSkeleton />;
  }

  return <DesktopProductDetailsSkeleton />;
}

function MobileProductDetailsSkeleton() {
  return (
    <Box sx={{ bgcolor: "background.default", pb: 24 }}>
      <Box sx={{ mb: 1.5 }}>
        <Skeleton
          variant="rectangular"
          width="100%"
          height={280}
          sx={{ borderRadius: 0 }}
        />

        <Box sx={{ display: "flex", gap: 1, mt: 1.5, px: 2 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="rectangular"
              width={60}
              height={60}
              sx={{ borderRadius: 1.5, flexShrink: 0 }}
            />
          ))}
        </Box>
      </Box>

      <Box sx={{ px: 2 }}>
        <Skeleton variant="text" width="88%" height={42} sx={{ mb: 1 }} />

        <Stack direction="row" spacing={1} mb={1.5} flexWrap="wrap" useFlexGap>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="rectangular"
              width={96}
              height={28}
              sx={{ borderRadius: 999 }}
            />
          ))}
        </Stack>

        <Paper elevation={0} sx={{ borderRadius: 2.5, p: 1.75 }}>
          <Skeleton variant="text" width="35%" height={18} />
          <Skeleton variant="text" width="55%" height={38} sx={{ mt: 0.5 }} />
          <Skeleton variant="text" width="40%" height={18} sx={{ mt: 0.75 }} />
          <Skeleton variant="rectangular" width="50%" height={20} sx={{ mt: 1.25, borderRadius: 1 }} />
        </Paper>

        <Paper elevation={0} sx={{ borderRadius: 2.5, p: 1.5, mt: 1.5 }}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Skeleton variant="circular" width={40} height={40} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="45%" height={22} />
              <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                <Skeleton variant="rectangular" width={64} height={24} sx={{ borderRadius: 999 }} />
                <Skeleton variant="rectangular" width={92} height={24} sx={{ borderRadius: 999 }} />
              </Stack>
            </Box>
          </Stack>
        </Paper>

        <Stack spacing={1.5} sx={{ mt: 1.5 }}>
          <Skeleton variant="rectangular" width="100%" height={48} sx={{ borderRadius: 1.5 }} />
          <Skeleton variant="rectangular" width="100%" height={48} sx={{ borderRadius: 1.5 }} />
        </Stack>

        <Paper elevation={0} sx={{ borderRadius: 2, p: 2, mt: 1.5 }}>
          <Skeleton variant="text" width="40%" height={24} sx={{ mb: 1 }} />
          <Skeleton variant="text" width="100%" />
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="text" width="60%" />
        </Paper>

        <Paper elevation={0} sx={{ borderRadius: 2.5, p: 2, mt: 2 }}>
          <Skeleton variant="text" width="32%" height={28} />
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.75 }}>
            <Skeleton variant="text" width={48} height={36} />
            <Skeleton variant="text" width={110} height={28} />
          </Stack>
          <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
            <Skeleton variant="rectangular" width="100%" height={120} sx={{ borderRadius: 2.5 }} />
          </Stack>
        </Paper>

        <Paper elevation={0} sx={{ borderRadius: 2.5, p: 2, mt: 2.5 }}>
          <Skeleton variant="text" width="52%" height={32} sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Grid item xs={6} key={i}>
                <Skeleton
                  variant="rectangular"
                  height={120}
                  sx={{ borderRadius: 1 }}
                />
                <Skeleton variant="text" width="80%" sx={{ mt: 1 }} />
                <Skeleton variant="text" width="60%" />
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Box>

      <Paper
        elevation={2}
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          width: "100%",
          zIndex: 10,
          borderRadius: "20px 20px 0 0",
          p: "12px 16px",
        }}
      >
        <Skeleton variant="text" width="42%" height={28} sx={{ mb: 1 }} />
        <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 1.5 }} />
      </Paper>
    </Box>
  );
}

function DesktopProductDetailsSkeleton() {
  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack spacing={3}>
        <Skeleton variant="text" width="70%" height={60} />

        <Grid container spacing={3}>
          <Grid item xs={12} md={6} lg={7}>
            <Stack spacing={2}>
              <Skeleton
                variant="rectangular"
                width="100%"
                height={400}
                sx={{ borderRadius: 3 }}
              />
              <Paper elevation={0} sx={{ borderRadius: 2.5, p: 2.5 }}>
                <Box sx={{ display: "flex", gap: 2 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton
                      key={i}
                      variant="rectangular"
                      width={100}
                      height={100}
                      sx={{ borderRadius: 1.5, flexShrink: 0 }}
                    />
                  ))}
                </Box>
              </Paper>
            </Stack>
          </Grid>

          <Grid item xs={12} md={6} lg={5}>
            <Stack spacing={2.5}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    variant="rectangular"
                    width={104}
                    height={28}
                    sx={{ borderRadius: 999 }}
                  />
                ))}
              </Stack>

              <Paper
                elevation={0}
                sx={{
                  borderRadius: 2.5,
                  p: 2.5,
                  border: 1,
                  borderColor: "divider",
                }}
              >
                <Skeleton variant="text" width="35%" height={18} />
                <Skeleton variant="text" width="58%" height={46} sx={{ mt: 0.5 }} />
                <Skeleton variant="text" width="42%" height={18} sx={{ mt: 1 }} />
                <Skeleton variant="rectangular" width="46%" height={22} sx={{ mt: 1.25, borderRadius: 1 }} />
              </Paper>

              <Paper elevation={0} sx={{ borderRadius: 2.5, p: 2 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Skeleton variant="circular" width={44} height={44} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="40%" height={24} />
                    <Stack direction="row" spacing={1} sx={{ mt: 0.75 }}>
                      <Skeleton variant="rectangular" width={68} height={24} sx={{ borderRadius: 999 }} />
                      <Skeleton variant="rectangular" width={96} height={24} sx={{ borderRadius: 999 }} />
                    </Stack>
                  </Box>
                </Stack>
              </Paper>

              <Stack spacing={1.5}>
                <Skeleton
                  variant="rectangular"
                  width="100%"
                  height={48}
                  sx={{ borderRadius: 1.5 }}
                />
                <Skeleton
                  variant="rectangular"
                  width="100%"
                  height={48}
                  sx={{ borderRadius: 1.5 }}
                />
              </Stack>

              <Paper elevation={0} sx={{ borderRadius: 2, p: 2.5 }}>
                <Skeleton
                  variant="text"
                  width="30%"
                  height={28}
                  sx={{ mb: 1 }}
                />
                <Skeleton variant="text" width="100%" />
                <Skeleton variant="text" width="90%" />
                <Skeleton variant="text" width="75%" />
              </Paper>
            </Stack>
          </Grid>
        </Grid>

        <Paper elevation={0} sx={{ borderRadius: 2.5, p: 3 }}>
          <Skeleton variant="text" width="18%" height={36} />
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
            <Skeleton variant="text" width={64} height={40} />
            <Skeleton variant="text" width={120} height={32} />
          </Stack>
          <Box sx={{ mt: 2.5 }}>
            <Grid container spacing={2}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Grid item xs={12} md={4} key={i}>
                  <Skeleton
                    variant="rectangular"
                    height={180}
                    sx={{ borderRadius: 3 }}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ borderRadius: 2.5, p: 3 }}>
          <Skeleton variant="text" width="28%" height={36} sx={{ mb: 3 }} />
          <Grid container spacing={2}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Grid item xs={6} sm={4} md={3} key={i}>
                <Skeleton
                  variant="rectangular"
                  height={200}
                  sx={{ borderRadius: 1 }}
                />
                <Skeleton variant="text" width="90%" sx={{ mt: 1 }} />
                <Skeleton variant="text" width="70%" />
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Stack>
    </Container>
  );
}
