import { UserBaseModel, UserUpdateModel } from "@/entities/user";
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
  IconButton,
  TextField,
  Button,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { styled } from "@mui/material/styles";
import { useState } from "react";

interface ProfileWidgetProps {
  //userData: UserUpdateModel;
  onBack: () => void;
}

const ProfileWidget: React.FC<ProfileWidgetProps> = ({ onBack }) => {
  return (
    <Box sx={{ py: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <IconButton onClick={onBack} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" component="h2">
          Профиль
        </Typography>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField fullWidth label="Логин" defaultValue={""} disabled />
          </Grid>

          <Grid item xs={12}>
            <TextField fullWidth label="Полное имя" defaultValue={""} />
          </Grid>

          <Grid item xs={12}>
            <TextField fullWidth label="Email" type="email" defaultValue={""} />
          </Grid>

          <Grid item xs={12}>
            <Button variant="contained" color="primary">
              Сохранить изменения
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default ProfileWidget;
