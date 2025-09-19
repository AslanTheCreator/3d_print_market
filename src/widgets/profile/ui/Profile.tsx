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
  Avatar,
  styled,
} from "@mui/material";
import { ArrowBack, PhotoCamera, Delete } from "@mui/icons-material";
import { useState, useRef } from "react";
import { useUpdateUser } from "@/entities/user";
import { useImageUpload } from "@/features/image-upload";

interface ProfileWidgetProps {
  //userData: UserUpdateModel;
  onBack: () => void;
}

interface ProfileFormValues {
  fullName: string;
  phoneNumber: string;
  imageIds: number[];
}

// Стилизованные компоненты для загрузки аватара
const AvatarUploadContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: theme.spacing(2),
  padding: theme.spacing(3),
  border: `2px dashed ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius * 2,
  backgroundColor: theme.palette.background.paper,
  transition: "all 0.3s ease",
  cursor: "pointer",
  position: "relative",
  "&:hover": {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.action.hover,
  },
  "&.dragover": {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.primary.light + "10",
  },
}));

const AvatarPreview = styled(Avatar)(({ theme }) => ({
  width: 120,
  height: 120,
  border: `4px solid ${theme.palette.background.paper}`,
  boxShadow: theme.shadows[4],
  fontSize: "3rem",
  "& .MuiAvatar-img": {
    objectFit: "cover",
  },
}));

const AvatarOverlay = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  borderRadius: theme.shape.borderRadius * 2,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  opacity: 0,
  transition: "opacity 0.3s ease",
  ".avatar-upload:hover &": {
    opacity: 1,
  },
}));

const HiddenInput = styled("input")({
  display: "none",
});

const ProfileWidget: React.FC<ProfileWidgetProps> = ({ onBack }) => {
  const [isPending, setIsPending] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [severity, setSeverity] = useState<"success" | "error">("success");
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutateAsync } = useUpdateUser();
  const {
    imagePreview,
    imageError,
    imageIds,
    isUploading,
    handleImageChange,
    resetImageState,
  } = useImageUpload("PARTICIPANT");

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    defaultValues: {
      fullName: "",
      phoneNumber: "",
    },
  });

  const onSubmit = (data: ProfileFormValues) => {
    try {
      const updateData = {
        ...data,
        imageIds: imageIds.length ? imageIds : [0],
        deadlineSending: 0,
        deadlinePayment: 0,
        login: "",
      };
      mutateAsync(updateData);
      console.log("Обновление данных пользователя:", updateData);
    } catch (error) {
      console.error("Ошибка при обновлении профиля:", error);
    }
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageChange(file);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);

    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleImageChange(file);
    }
  };

  const handleDeleteAvatar = (event: React.MouseEvent) => {
    event.stopPropagation();
    resetImageState();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
            {/* Avatar Upload Section */}
            <Grid item xs={12}>
              <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Фото профиля
                  </Typography>

                  <AvatarUploadContainer
                    className={`avatar-upload ${isDragOver ? "dragover" : ""}`}
                    onClick={handleAvatarClick}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    sx={{ position: "relative" }}
                  >
                    <HiddenInput
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                    />

                    {imagePreview ? (
                      <Box sx={{ position: "relative" }}>
                        <AvatarPreview src={imagePreview} />
                        <AvatarOverlay>
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <IconButton
                              size="small"
                              sx={{
                                color: "white",
                                backgroundColor: "rgba(255, 255, 255, 0.2)",
                                "&:hover": {
                                  backgroundColor: "rgba(255, 255, 255, 0.3)",
                                },
                              }}
                            >
                              <PhotoCamera />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={handleDeleteAvatar}
                              sx={{
                                color: "white",
                                backgroundColor: "rgba(255, 255, 255, 0.2)",
                                "&:hover": {
                                  backgroundColor: "rgba(255, 255, 255, 0.3)",
                                },
                              }}
                            >
                              <Delete />
                            </IconButton>
                          </Box>
                        </AvatarOverlay>
                      </Box>
                    ) : (
                      <>
                        <AvatarPreview>
                          {isUploading ? (
                            <CircularProgress size={40} />
                          ) : (
                            <PhotoCamera
                              sx={{ fontSize: "3rem", color: "text.secondary" }}
                            />
                          )}
                        </AvatarPreview>
                        <Box sx={{ textAlign: "center" }}>
                          <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 600, mb: 1 }}
                          >
                            {isUploading ? "Загрузка..." : "Загрузить фото"}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Перетащите файл сюда или нажмите для выбора
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Поддерживаются форматы: JPG, PNG, WEBP (макс. 5MB)
                          </Typography>
                        </Box>
                      </>
                    )}
                  </AvatarUploadContainer>

                  {imageError && (
                    <Alert severity="error" sx={{ mt: 2, textAlign: "left" }}>
                      {imageError}
                    </Alert>
                  )}
                </Box>
              </Box>
            </Grid>

            {/* Name field */}
            <Grid item xs={12}>
              <Controller
                name="fullName"
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
                    id="fullName"
                    label="Имя"
                    placeholder="Введите ваше имя"
                    error={!!errors.fullName}
                    helperText={errors.fullName?.message}
                    {...field}
                  />
                )}
              />
            </Grid>

            {/* Phone field */}
            <Grid item xs={12}>
              <Controller
                name="phoneNumber"
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
                    id="phoneNumber"
                    label="Номер телефона"
                    placeholder="+7 (999) 123-45-67"
                    error={!!errors.phoneNumber}
                    helperText={errors.phoneNumber?.message}
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
                disabled={isPending || isUploading}
                sx={{
                  mt: 2,
                  py: 1.5,
                  fontSize: { xs: "1rem", md: "1.1rem" },
                  fontWeight: 700,
                }}
              >
                {isPending || isUploading ? (
                  <>
                    <CircularProgress
                      size={24}
                      color="inherit"
                      sx={{ mr: 1 }}
                    />
                    {isUploading ? "Загрузка изображения..." : "Сохранение..."}
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
