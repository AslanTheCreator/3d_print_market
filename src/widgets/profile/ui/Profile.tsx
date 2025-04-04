import { UserBaseModel } from "@/entities/user";
import PersonalInfoSection from "@/features/profile/ui/PersonalInfoSection";
import {
  Container,
  Grid,
  Typography,
  Box,
  Snackbar,
  Alert,
  Paper,
  Tabs,
  Tab,
} from "@mui/material";
import { useState } from "react";

interface ProfileWidgetProps {
  userData: UserBaseModel;
}

const ProfileWidget: React.FC<ProfileWidgetProps> = ({ userData }) => {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4 }}>
        Личные данные
      </Typography>
      <Paper sx={{ mb: 4, p: { xs: 2, sm: 3 } }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}></Box>
      </Paper>
    </Container>
  );
};

export default ProfileWidget;
