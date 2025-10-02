import { Container, Paper, Box, IconButton, Typography } from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { ProfileForm } from "@/features/profile/update-profile";

interface ProfileWidgetProps {
  onBack: () => void;
}

export const ProfileWidget: React.FC<ProfileWidgetProps> = ({ onBack }) => {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
      <Paper elevation={2} sx={{ p: { xs: 2, md: 4 }, borderRadius: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
          <IconButton onClick={onBack} sx={{ mr: 1 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            Личные данные
          </Typography>
        </Box>

        <ProfileForm />
      </Paper>
    </Container>
  );
};
