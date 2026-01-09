"use client";

import React, { useState } from "react";
import {
  Box,
  Container,
  Paper,
  useMediaQuery,
  Grid,
  Card,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useCurrentUser } from "@/entities/user";
import { UserInfoCard } from "@/widgets/user";
import { DashboardContent } from "@/widgets/dashboard";
import { DashboardNavigation } from "@/widgets/dashboard";
import { ProfileForm } from "@/widgets/profile-form";
import { motion } from "framer-motion";
import { ErrorState } from "@/shared/ui/states";
import { DashboardSkeleton } from "@/shared/ui/skeletons";

// Типы для внутренней навигации страницы
type DashboardTab = "main" | "profile";

export default function DashboardView() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { data: userData, isLoading, error } = useCurrentUser();

  // Локальное состояние для переключения табов внутри страницы
  const [currentTab, setCurrentTab] = useState<DashboardTab>("main");

  if (isLoading) {
    return <DashboardSkeleton isMobile={isMobile} />;
  }

  if (error || !userData) {
    return <ErrorState type="profile" />;
  }

  // Обработчики для внутренней навигации
  const handleEditProfile = () => setCurrentTab("profile");
  const handleBackToDashboard = () => setCurrentTab("main");

  // Рендер контента в зависимости от активного таба
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

  // Мобильная версия
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

  // Десктопная версия
  return (
    <Container sx={{ pt: "20px" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Grid container spacing={4}>
          {/* Левая колонка - профиль и навигация */}
          <Grid item xs={12} md={4}>
            <Box sx={{ position: "sticky", top: 24 }}>
              {/* Информация о пользователе */}
              <Card
                sx={{
                  mb: 3,
                  color: "white",
                }}
              >
                <UserInfoCard user={userData} onEdit={handleEditProfile} />
              </Card>

              {/* Навигация */}
              <DashboardNavigation />
            </Box>
          </Grid>

          {/* Правая колонка - основной контент */}
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
}
