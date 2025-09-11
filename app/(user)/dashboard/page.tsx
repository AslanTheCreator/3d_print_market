"use client";

import { DashboardView } from "@/widgets/dashboard-view";
import { Container } from "@mui/material";

export default function DashboardPage() {
  return (
    <Container sx={{ pt: "20px" }}>
      <DashboardView />
    </Container>
  );
}
