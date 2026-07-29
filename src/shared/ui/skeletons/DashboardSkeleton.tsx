import { Box, Container, Skeleton } from "@mui/material";
import React from "react";

export const DashboardSkeleton: React.FC = () => (
  <Container maxWidth="xl" sx={{ py: 4 }}>
    <Box
      sx={{
        display: "grid",
        gap: { xs: 2, md: 3 },
        gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) minmax(0, 2fr)" },
        gridTemplateAreas: {
          xs: '"profile" "details" "activity"',
          md: '"profile activity" "details activity"',
        },
        alignItems: "start",
      }}
    >
      <Skeleton
        variant="rectangular"
        sx={{ gridArea: "profile", borderRadius: 2, height: 200 }}
      />
      <Skeleton
        variant="rectangular"
        sx={{
          gridArea: "details",
          borderRadius: 2,
          height: { xs: 400, md: 500 },
        }}
      />
      <Skeleton
        variant="rectangular"
        sx={{
          gridArea: "activity",
          borderRadius: 2,
          height: { xs: 300, md: 600 },
        }}
      />
    </Box>
  </Container>
);
