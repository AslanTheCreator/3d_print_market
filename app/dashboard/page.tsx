"use client";

import React from "react";
import {
  Box,
  Container,
  Paper,
  useMediaQuery,
  Typography,
  Card,
  CardContent,
  Grid,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { User, UserInfo } from "@/entities/user";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useUser } from "@/entities/user/hooks/useUser";
import { DashboardNavigation } from "@/widgets/dashboard-navigation";

export default function DashboardPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { token, isLoading: authLoading } = useAuth();
  const { data: userData } = useUser({ token });
  if (!userData) return null;
  return (
    <Container maxWidth="sm" sx={{ p: isMobile ? 2 : 3 }}>
      <Paper
        elevation={3}
        sx={{
          borderRadius: 2,
          overflow: "hidden",
          mb: 2,
        }}
      >
        {/* User Profile Header */}
        <UserInfo user={userData} />
      </Paper>

      {/* Main Content */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ py: 2 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Добро пожаловать, {userData.fullName}!
          </Typography>

          <Typography variant="body1" color="text.secondary" paragraph>
            Управляйте вашими заказами и настройками через личный кабинет.
          </Typography>

          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Активность
                  </Typography>
                  <Typography variant="body2">
                    У вас нет текущих заказов.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Box>

      {/* Navigation Menu */}
      <DashboardNavigation />
    </Container>
  );
}
