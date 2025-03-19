import { User } from "@/entities/user";
import PersonalInfoSection from "@/features/profile/ui/PersonalInfoSection";
import {
  Container,
  Grid,
  Typography,
  Box,
  Snackbar,
  Alert,
} from "@mui/material";

interface ProfileWidgetProps {
  userData: User;
}

const ProfileWidget: React.FC<ProfileWidgetProps> = ({ userData }) => {
  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Профиль пользователя
      </Typography>

      <Box sx={{ p: 3, mb: 3, borderRadius: 2, bgcolor: "background.paper" }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={4} display="flex" justifyContent="center">
            {/* <UserAvatar
              avatarUrl={userData.avatarUrl}
              fullName={userData.fullName}
              editable
              onEditClick={() => console.log("Edit avatar")}
            /> */}
          </Grid>
          <Grid item xs={12} sm={8}>
            <Typography variant="h5">{userData.fullName}</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
              {userData.mail}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {userData.phoneNumber}
            </Typography>
          </Grid>
        </Grid>
      </Box>
      <PersonalInfoSection userData={userData} />
    </Container>
  );
};

export default ProfileWidget;
