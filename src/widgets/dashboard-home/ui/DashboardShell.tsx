"use client";

import React, { ReactNode } from "react";
import { Box, Container } from "@mui/material";
import { LAYOUT } from "@/shared/config";
import { DashboardNavigation } from "./DashboardNavigation";

interface DashboardShellProps {
  children: ReactNode;
}

export const DashboardShell = ({ children }: DashboardShellProps) => {
  return (
    <Container
      maxWidth="lg"
      sx={{
        pt: { xs: 1.5, md: "20px" },
        pb: { xs: 3, md: 4 },
        px: { xs: 1.5, sm: 2, md: 3 },
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "260px minmax(0, 1fr)",
            lg: "280px minmax(0, 1fr)",
          },
          gap: { xs: 1.5, md: 3, lg: 4 },
          alignItems: "start",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Box
            sx={{
              position: { md: "sticky" },
              top: { md: `calc(${LAYOUT.HEADER_HEIGHT_PX} + 16px)` },
            }}
          >
            <DashboardNavigation />
          </Box>
        </Box>

        <Box sx={{ minWidth: 0 }}>
          {children}
        </Box>
      </Box>
    </Container>
  );
};
