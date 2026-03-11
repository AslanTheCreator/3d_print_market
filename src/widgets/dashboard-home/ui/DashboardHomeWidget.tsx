"use client";

import React, { useState } from "react";
import { Box, Container, Paper, useMediaQuery, Grid, Card } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { motion } from "framer-motion";
import { useCurrentUser } from "@/entities/user";
import { ErrorState } from "@/shared/ui/states";
import { DashboardSkeleton } from "@/shared/ui/skeletons";
import { DashboardContent } from "./DashboardContent";
import { DashboardNavigation } from "./DashboardNavigation";
import { ProfileForm } from "./ProfileForm";
import { UserInfoCard } from "./UserInfoCard";

type DashboardTab = "main" | "profile";

export const DashboardHomeWidget = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { data: userData, isLoading, error } = useCurrentUser();
  const [currentTab, setCurrentTab] = useState<DashboardTab>("main");

  if (isLoading) {
    return <DashboardSkeleton isMobile={isMobile} />;
  }

  if (error || !userData) {
    return <ErrorState type="profile" />;
  }

  const handleEditProfile = () => setCurrentTab("profile");
  const handleBackToDashboard = () => setCurrentTab("main");

  const renderMainContent = () => {
    if (currentTab === "profile") {
      return (
        <ProfileForm
          onBack={handleBackToDashboard}
          initialData={userData}
          onSuccess={handleBackToDashboard}
        />
      );
    }

    return <DashboardContent user={userData} />;
  };

  if (isMobile) {
    return (
      <Container maxWidth="sm" sx={{ p: 2, marginTop: 2, mb: 3 }}>
        {currentTab === "main" ? (
          <>
            <Paper
              elevation={3}
              sx={{
                borderRadius: 2,
                overflow: "hidden",
                mb: 2,
              }}
            >
              <UserInfoCard user={userData} onEdit={handleEditProfile} />
            </Paper>
            <DashboardNavigation />
          </>
        ) : (
          <ProfileForm
            onBack={handleBackToDashboard}
            initialData={userData}
            onSuccess={handleBackToDashboard}
          />
        )}
      </Container>
    );
  }

  return (
    <Container sx={{ pt: "20px" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Box sx={{ position: "sticky", top: 24 }}>
              <Card
                sx={{
                  mb: 3,
                  color: "white",
                }}
              >
                <UserInfoCard user={userData} onEdit={handleEditProfile} />
              </Card>
              <DashboardNavigation />
            </Box>
          </Grid>

          <Grid item xs={12} md={8}>
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {renderMainContent()}
            </motion.div>
          </Grid>
        </Grid>
      </motion.div>
    </Container>
  );
};
