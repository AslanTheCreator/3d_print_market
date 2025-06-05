import { Container, Grid, Skeleton, Stack } from "@mui/material";

export const ProductDetailsSkeleton = () => (
  <Container maxWidth="lg" sx={{ pt: { xs: 1, sm: 2, md: 3 } }}>
    <Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
      <Skeleton variant="text" width="80%" height={40} />
      <Grid container spacing={{ xs: 2, md: 4 }}>
        <Grid item xs={12} md={6}>
          <Skeleton
            variant="rectangular"
            width="100%"
            height={250}
            sx={{ borderRadius: 2 }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Stack spacing={2}>
            <Skeleton variant="rectangular" width="100%" height={60} />
            <Skeleton variant="rectangular" width="100%" height={80} />
            <Skeleton variant="rectangular" width="100%" height={120} />
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  </Container>
);
