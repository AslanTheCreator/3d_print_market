"use client";

import React, { useState } from "react";
import {
  Box,
  Container,
  Paper,
  useMediaQuery,
  Grid,
  Skeleton,
  Alert,
  Card,
  CardContent,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useProfileUser, UserInfo } from "@/entities/user";
import { ProfileWidget } from "@/widgets/profile";
import { DashboardContent } from "@/widgets/dashboard";
import { DashboardNavigation } from "@/widgets/dashboard";
import { motion } from "framer-motion";

// Перечисление для секций дашборда
type DashboardSection = "main" | "profile" | "payment-methods";

// Компонент скелетона для загрузки
const DashboardSkeleton = ({ isMobile }: { isMobile: boolean }) => (
  <Container maxWidth={isMobile ? "sm" : "xl"} sx={{ py: 4 }}>
    <Grid container spacing={3}>
      {isMobile ? (
        <Grid item xs={12}>
          <Skeleton
            variant="rectangular"
            height={200}
            sx={{ borderRadius: 2, mb: 2 }}
          />
          <Skeleton
            variant="rectangular"
            height={400}
            sx={{ borderRadius: 2, mb: 2 }}
          />
          <Skeleton
            variant="rectangular"
            height={300}
            sx={{ borderRadius: 2 }}
          />
        </Grid>
      ) : (
        <>
          <Grid item xs={12} md={4}>
            <Skeleton
              variant="rectangular"
              height={200}
              sx={{ borderRadius: 2, mb: 3 }}
            />
            <Skeleton
              variant="rectangular"
              height={500}
              sx={{ borderRadius: 2 }}
            />
          </Grid>
          <Grid item xs={12} md={8}>
            <Skeleton
              variant="rectangular"
              height={600}
              sx={{ borderRadius: 2 }}
            />
          </Grid>
        </>
      )}
    </Grid>
  </Container>
);

// Компонент ошибки
const DashboardError = ({ isMobile }: { isMobile: boolean }) => (
  <Container maxWidth={isMobile ? "sm" : "xl"} sx={{ py: 4 }}>
    <Alert
      severity="error"
      sx={{
        borderRadius: 2,
        "& .MuiAlert-message": {
          fontSize: "1rem",
        },
      }}
    >
      <Typography variant="h6" gutterBottom>
        Ошибка загрузки профиля
      </Typography>
      <Typography>
        Не удалось загрузить данные профиля. Попробуйте обновить страницу.
      </Typography>
    </Alert>
  </Container>
);

export default function DashboardView() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { data: userData, isLoading, error } = useProfileUser();

  const [activeSection, setActiveSection] = useState<DashboardSection>("main");

  // Handle loading and error states
  if (isLoading) {
    return <DashboardSkeleton isMobile={isMobile} />;
  }

  if (error || !userData) {
    return <DashboardError isMobile={isMobile} />;
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

  // Мобильная версия (оригинальный дизайн)
  if (isMobile) {
    return (
      <Container maxWidth="sm" sx={{ p: 2, marginTop: 2, mb: 3 }}>
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

  // Десктопная версия (новый дизайн)
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
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
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  color: "white",
                }}
              >
                <UserInfo user={userData} />
              </Card>

              {/* Навигация */}
              <DashboardNavigation
                onNavigate={navigateTo}
                activeSection={activeSection}
              />
            </Box>
          </Grid>

          {/* Правая колонка - основной контент */}
          <Grid item xs={12} md={8}>
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card sx={{ minHeight: 600 }}>
                <CardContent sx={{ p: 4 }}>{renderContent()}</CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>
      </motion.div>
    </Container>
  );
}
