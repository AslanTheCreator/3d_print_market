"use client";

import React from "react";
import { Shield } from "@mui/icons-material";
import { Container } from "@mui/material";
import { PageHeader } from "@/shared/ui/page-header";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const DashboardSecurityWidget = () => {
  return (
    <Container
      maxWidth="md"
      sx={{
        py: { xs: 2, sm: 3 },
        px: { xs: 2, sm: 3 },
      }}
    >
      <PageHeader
        title="Безопасность"
        subtitle="Управление паролем и настройками безопасности."
        icon={<Shield />}
      />

      <ChangePasswordForm />
    </Container>
  );
};
