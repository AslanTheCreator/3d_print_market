"use client";

import React, { useState } from "react";
import { Box, Container, Paper, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { UserInfo } from "@/entities/user";
import { useProfileUser } from "@/entities/user/hooks/useProfileUser";
import ProfileWidget from "@/widgets/profile/ui/Profile";
import { DashboardContent } from "@/widgets/dashboard";
import { DashboardNavigation } from "@/widgets/dashboard";

// Перечисление для секций дашборда
type DashboardSection = "main" | "profile" | "payment-methods";

export default function DashboardPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { data: userData } = useProfileUser();

  const [activeSection, setActiveSection] = useState<DashboardSection>("main");

  if (!userData) return null; // заглушка

  const navigateTo = (section: DashboardSection) => {
    setActiveSection(section);
  };

  const renderContent = () => {
    switch (activeSection) {
      case "profile":
        return <ProfileWidget onBack={() => navigateTo("main")} />;
      case "main":
      default:
        return <DashboardContent user={userData} />;
    }
  };

  return (
    <Container maxWidth="sm" sx={{ p: isMobile ? 2 : 3, marginTop: 2, mb: 3 }}>
      {activeSection === "main" && (
        <Paper
          elevation={3}
          sx={{
            borderRadius: 2,
            overflow: "hidden",
            mb: 2,
          }}
        >
          <UserInfo user={userData} />
        </Paper>
      )}

      {/* Main Content */}
      <Box sx={{ mb: 3 }}>{renderContent()}</Box>

      {/* Navigation Menu */}
      {activeSection === "main" && (
        <DashboardNavigation
          onNavigate={navigateTo}
          activeSection={activeSection}
        />
      )}
    </Container>
  );
}
