"use client";

import React, { ReactNode, useEffect, useState } from "react";
import { Box, Card, Container, Grid, Paper, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/entities/user";
import { LAYOUT } from "@/shared/config";
import { ErrorState } from "@/shared/ui/states";
import { DashboardSkeleton } from "@/shared/ui/skeletons";
import { DashboardNavigation } from "./DashboardNavigation";
import { ProfileForm } from "./ProfileForm";
import { UserInfoCard } from "./UserInfoCard";

interface DashboardShellProps {
  children: ReactNode;
}

export const DashboardShell = ({ children }: DashboardShellProps) => {
  const theme = useTheme();
  const pathname = usePathname();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { data: userData, isLoading, error } = useCurrentUser();
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  useEffect(() => {
    setIsEditingProfile(false);
  }, [pathname]);

  if (isLoading) {
    return <DashboardSkeleton isMobile={isMobile} />;
  }

  if (error || !userData) {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 } }}>
        <ErrorState type="profile" />
      </Container>
    );
  }

  const handleEditProfile = () => setIsEditingProfile(true);
  const handleBackToDashboard = () => setIsEditingProfile(false);

  const content = isEditingProfile ? (
    <ProfileForm
      onBack={handleBackToDashboard}
      initialData={userData}
      onSuccess={handleBackToDashboard}
    />
  ) : (
    children
  );

  if (isMobile) {
    return (
      <Container maxWidth="sm" sx={{ p: 2, mt: 2, mb: 3 }}>
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

        <Box sx={{ mb: 2 }}>
          <DashboardNavigation />
        </Box>

        {content}
      </Container>
    );
  }

  return (
    <Container sx={{ pt: "20px", pb: 4 }}>
      <Grid container spacing={4}>
        <Grid item xs={12} md={4}>
          <Box
            sx={{
              position: "sticky",
              top: `calc(${LAYOUT.HEADER_HEIGHT_PX} + 16px)`,
            }}
          >
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
          {content}
        </Grid>
      </Grid>
    </Container>
  );
};
