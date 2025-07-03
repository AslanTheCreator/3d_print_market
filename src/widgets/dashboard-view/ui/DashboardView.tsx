"use client";

import React, { useState } from "react";
import { Box, Container, Paper, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { UserInfo } from "@/entities/user";
import { useProfileUser } from "@/entities/user/hooks/useProfileUser";
import { ProfileWidget } from "@/widgets/profile";
import { DashboardContent } from "@/widgets/dashboard";
import { DashboardNavigation } from "@/widgets/dashboard";

// Перечисление для секций дашборда
type DashboardSection = "main" | "profile" | "payment-methods";

export default function DashboardView() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { data: userData, isLoading, error } = useProfileUser(); // Added isLoading and error for better UX

  const [activeSection, setActiveSection] = useState<DashboardSection>("main");

  // Handle loading and error states
  if (isLoading) {
    // TODO: Replace with a proper skeleton loader or loading spinner component from shared/ui
    return <Container maxWidth="sm" sx={{ p: isMobile ? 2 : 3, marginTop: 2, mb: 3 }}><p>Loading...</p></Container>;
  }

  if (error || !userData) {
    // TODO: Replace with a proper error component from shared/ui
    return <Container maxWidth="sm" sx={{ p: isMobile ? 2 : 3, marginTop: 2, mb: 3 }}><p>Error loading profile data.</p></Container>;
  }

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
