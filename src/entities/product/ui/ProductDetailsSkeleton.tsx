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
    <Box sx={{ bgcolor: "background.default", pb: 10 }}>
      {/* Title */}
      <Box sx={{ p: 1.5 }}>
        <Skeleton variant="text" width="90%" height={40} />
      </Box>

      {/* Image Gallery */}
      <Box sx={{ px: 0, mb: 2 }}>
        <Skeleton
          variant="rectangular"
          width="100%"
          height={280}
          sx={{ borderRadius: 2 }}
        />
        {/* Thumbnails */}
        <Box sx={{ display: "flex", gap: 1, mt: 1.5, px: 2 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="rectangular"
              width={60}
              height={60}
              sx={{ borderRadius: 1, flexShrink: 0 }}
            />
          ))}
        </Box>
      </Box>

      {/* Price and Rating */}
      <Stack
        direction="row"
        justifyContent="space-between"
        sx={{ px: 1.5, mb: 1.5 }}
      >
        <Skeleton
          variant="rectangular"
          width={170}
          height={60}
          sx={{ borderRadius: 2.5 }}
        />
        <Skeleton
          variant="rectangular"
          width={120}
          height={60}
          sx={{ borderRadius: 2.5 }}
        />
      </Stack>

      {/* Description */}
      <Box sx={{ px: 1.5, mb: 1.5 }}>
        <Paper elevation={0} sx={{ borderRadius: 2.5, p: 1.5 }}>
          <Skeleton variant="text" width="40%" height={24} sx={{ mb: 1 }} />
          <Skeleton variant="text" width="100%" />
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="text" width="60%" />
        </Paper>
      </Box>

      {/* Related Products */}
      <Box sx={{ px: 1.5 }}>
        <Paper elevation={0} sx={{ borderRadius: 2.5, p: 2 }}>
          <Skeleton variant="text" width="50%" height={32} sx={{ mb: 2 }} />
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

      {/* Fixed Bottom Cart */}
      <Paper
        elevation={2}
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          width: "100%",
          zIndex: 10,
          borderRadius: "20px 20px 0 0",
          p: "12px",
        }}
      >
        <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 1 }} />
      </Paper>
    </Box>
  );
}

function DesktopProductDetailsSkeleton() {
  return (
    <Container maxWidth="lg" sx={{ pt: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={{ xs: 2, sm: 3, md: 4 }}>
        {/* Title */}
        <Skeleton variant="text" width="70%" height={60} />

        <Grid container spacing={{ xs: 2, sm: 3, md: 4, lg: 6 }}>
          {/* Image Gallery */}
          <Grid item xs={12} md={6} lg={7}>
            <Stack spacing={2}>
              <Skeleton
                variant="rectangular"
                width="100%"
                height={400}
                sx={{ borderRadius: 2 }}
              />
              {/* Thumbnails */}
              <Paper elevation={0} sx={{ borderRadius: 2.5, p: 3 }}>
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

          {/* Product Info */}
          <Grid item xs={12} md={6} lg={5}>
            <Stack spacing={3}>
              {/* Price */}
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 3,
                  p: "20px 28px",
                  border: 1,
                  borderColor: "divider",
                }}
              >
                <Skeleton variant="text" width="60%" height={40} />
                <Skeleton
                  variant="text"
                  width="40%"
                  height={20}
                  sx={{ mt: 1 }}
                />
              </Paper>

              {/* Rating */}
              <Paper elevation={0} sx={{ borderRadius: 2.5, p: "16px 20px" }}>
                <Skeleton variant="text" width="80%" height={24} />
              </Paper>

              {/* Add to Cart Button */}
              <Skeleton
                variant="rectangular"
                width="100%"
                height={48}
                sx={{ borderRadius: 1 }}
              />

              {/* Description */}
              <Paper elevation={0} sx={{ borderRadius: 2.5, p: 3 }}>
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

        {/* Related Products */}
        <Paper elevation={0} sx={{ borderRadius: 2.5, p: 3 }}>
          <Skeleton variant="text" width="30%" height={36} sx={{ mb: 3 }} />
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
