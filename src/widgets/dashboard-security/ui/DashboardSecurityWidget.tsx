"use client";

import React from "react";
import { Shield } from "@mui/icons-material";
import { Box } from "@mui/material";
import { PageHeader } from "@/shared/ui/page-header";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const DashboardSecurityWidget = () => {
  return (
    <Box
      sx={{
        width: "100%",
        py: { xs: 0, md: 3 },
      }}
    >
      <Box sx={{ display: { xs: "none", md: "block" } }}><PageHeader
        title="Безопасность"
        icon={<Shield />}
      /></Box>

      <ChangePasswordForm />
    </Box>
  );
};
