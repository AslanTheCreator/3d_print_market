// components/dashboard/DashboardContent.tsx
import React from "react";
import { Box, Typography, Card, CardContent, Grid } from "@mui/material";
import { UserProfileModel } from "@/entities/user";

interface DashboardContentProps {
  user: UserProfileModel;
}

export const DashboardContent: React.FC<DashboardContentProps> = ({ user }) => {
  const displayName = user.fullName?.trim() ? user.fullName : user.login;

  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Добро пожаловать, {displayName}!
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
  );
};
