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
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useState } from "react";

interface ProfileWidgetProps {
  userData: UserUpdateModel;
}

const ProfilePaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
  },
}));

const ProfileWidget: React.FC<ProfileWidgetProps> = ({ userData }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {};
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
