import { useForm, Controller } from "react-hook-form";
import {
  Container,
  Grid,
  Typography,
  Box,
  Snackbar,
  Alert,
  Paper,
  IconButton,
  TextField,
  Button,
  CircularProgress,
} from "@mui/material";
import { ArrowBack, CloudUpload } from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { useState } from "react";

interface ProfileWidgetProps {
  //userData: UserUpdateModel;
  onBack: () => void;
}

interface ProfileFormValues {
  name: string;
  email: string;
  phone: string;
}

const ProfileWidget: React.FC<ProfileWidgetProps> = ({ onBack }) => {
  const [isPending, setIsPending] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [severity, setSeverity] = useState<"success" | "error">("success");

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });

  const onSubmit = (data: ProfileFormValues) => {};

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

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
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={3}>
            {/* Name field */}
            <Grid item xs={12}>
              <Controller
                name="name"
                control={control}
                rules={{
                  required: "Введите ваше имя",
                  minLength: {
                    value: 2,
                    message: "Имя должно содержать минимум 2 символа",
                  },
                }}
                render={({ field }) => (
                  <TextField
                    fullWidth
                    id="name"
                    label="Имя"
                    placeholder="Введите ваше имя"
                    error={!!errors.name}
                    helperText={errors.name?.message}
                    {...field}
                  />
                )}
              />
            </Grid>

            {/* Email field */}
            <Grid item xs={12}>
              <Controller
                name="email"
                control={control}
                rules={{
                  required: "Введите вашу электронную почту",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Некорректный адрес электронной почты",
                  },
                }}
                render={({ field }) => (
                  <TextField
                    fullWidth
                    id="email"
                    label="Электронная почта"
                    placeholder="example@mail.ru"
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    {...field}
                  />
                )}
              />
            </Grid>

            {/* Phone field */}
            <Grid item xs={12}>
              <Controller
                name="phone"
                control={control}
                rules={{
                  pattern: {
                    value:
                      /^(\+7|8)[\s-]?\(?[0-9]{3}\)?[\s-]?[0-9]{3}[\s-]?[0-9]{2}[\s-]?[0-9]{2}$/,
                    message: "Введите корректный номер телефона",
                  },
                }}
                render={({ field }) => (
                  <TextField
                    fullWidth
                    id="phone"
                    label="Номер телефона"
                    placeholder="+7 (999) 123-45-67"
                    error={!!errors.phone}
                    helperText={errors.phone?.message}
                    {...field}
                  />
                )}
              />
            </Grid>

            {/* Submit button */}
            <Grid item xs={12}>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isPending}
                sx={{
                  mt: 2,
                  py: 1.5,
                  fontSize: { xs: "1rem", md: "1.1rem" },
                  fontWeight: 700,
                }}
              >
                {isPending ? (
                  <>
                    <CircularProgress
                      size={24}
                      color="inherit"
                      sx={{ mr: 1 }}
                    />
                    Сохранение...
                  </>
                ) : (
                  "Сохранить изменения"
                )}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={severity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ProfileWidget;
