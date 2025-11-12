import { Container, Grid, Skeleton } from "@mui/material";
import React from "react";

interface DashboardSkeletonProps {
  isMobile: boolean;
}

export const DashboardSkeleton: React.FC<DashboardSkeletonProps> = ({
  isMobile,
}) => (
  <Container maxWidth={isMobile ? "sm" : "xl"} sx={{ py: 4 }}>
    <Grid container spacing={3}>
      {isMobile ? (
        <Grid item xs={12}>
          <Skeleton
            variant="rectangular"
            height={200}
            sx={{ borderRadius: 2, mb: 2 }}
          />
          <Skeleton
            variant="rectangular"
            height={400}
            sx={{ borderRadius: 2, mb: 2 }}
          />
          <Skeleton
            variant="rectangular"
            height={300}
            sx={{ borderRadius: 2 }}
          />
        </Grid>
      ) : (
        <>
          <Grid item xs={12} md={4}>
            <Skeleton
              variant="rectangular"
              height={200}
              sx={{ borderRadius: 2, mb: 3 }}
            />
            <Skeleton
              variant="rectangular"
              height={500}
              sx={{ borderRadius: 2 }}
            />
          </Grid>
          <Grid item xs={12} md={8}>
            <Skeleton
              variant="rectangular"
              height={600}
              sx={{ borderRadius: 2 }}
            />
          </Grid>
        </>
      )}
    </Grid>
  </Container>
);
