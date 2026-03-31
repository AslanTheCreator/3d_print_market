"use client";

import { useForm, Controller } from "react-hook-form";
import {
  Paper,
  Box,
  Grid,
  TextField,
  Button,
  CircularProgress,
  Divider,
  useTheme,
  useMediaQuery,
  Typography,
  alpha,
  Stack,
} from "@mui/material";
import { BadgeOutlined, PersonOutline } from "@mui/icons-material";
import { AvatarUpload } from "@/shared/ui/avatar-upload";
import { useImageUpload } from "@/features/image-upload";
import { useUpdateUser, UserBaseModel } from "@/entities/user";
import { useNotification } from "@/shared/ui/notification";
import { useState, useEffect } from "react";
import { ProfileFormHeader } from "./components/ProfileFormHeader";
import { ProfileFormSection } from "./components/ProfileFormSection";

interface ProfileFormValues {
  fullName: string;
  phoneNumber: string;
  login: string;
}

interface ProfileFormProps {
  initialData?: UserBaseModel;
  onBack: () => void;
  onSuccess?: () => void;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({
  initialData,
  onBack,
  onSuccess,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { mutateAsync, isPending } = useUpdateUser();
  const { showNotification } = useNotification();
  const [hasImageChanged, setHasImageChanged] = useState(false);
  const [currentImageId, setCurrentImageId] = useState<number | null>(null);

  const {
    imagePreview,
    imageError,
    imageIds,
    isUploading,
    handleImageChange,
    resetImageState,
  } = useImageUpload("PARTICIPANT");

  const existingImage = initialData?.image?.[0];
  const existingImagePreview = existingImage
    ? `data:${existingImage.contentType};base64,${existingImage.imageData}`
    : null;

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    defaultValues: {
      fullName: initialData?.fullName ?? "",
      phoneNumber: initialData?.phoneNumber ?? "",
      login: initialData?.login ?? "",
    },
  });

  useEffect(() => {
    if (imageIds.length > 0) {
      setCurrentImageId(imageIds[0]);
    }
  }, [imageIds]);

  const handleImageChangeWrapper = (file: File) => {
    handleImageChange(file);
    setHasImageChanged(true);
  };

  const handleResetImage = () => {
    resetImageState();
    setHasImageChanged(true);
    setCurrentImageId(null);
  };

  const isFormChanged = isDirty || hasImageChanged;
  const isLoading = isPending || isUploading;
  const displayImagePreview = hasImageChanged
    ? imagePreview
    : imagePreview || existingImagePreview;

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      await mutateAsync({
        ...data,
        imageId: hasImageChanged ? currentImageId : null,
        deadlineSending: 0,
        deadlinePayment: 0,
      });
      showNotification("Профиль успешно обновлён", "success");
      onSuccess?.();
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "Не удалось сохранить изменения";
      showNotification(msg, "error");
    }
  };

  const statusText = isUploading
    ? "Сначала дождитесь загрузки фото."
    : isFormChanged
      ? "Изменения готовы к сохранению."
      : "Изменений пока нет.";

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        border: `1px solid ${theme.palette.divider}`,
        mx: "auto",
        maxWidth: 640,
        mb: { xs: 3, sm: 4 },
      }}
    >
      <ProfileFormHeader onBack={onBack} />

      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        sx={{ p: { xs: 2, sm: 3, md: 4 } }}
      >
        <Grid container spacing={{ xs: 2, sm: 2.5 }}>
          <Grid item xs={12}>
            <ProfileFormSection
              icon={<BadgeOutlined />}
              title="Фото профиля"
            />
          </Grid>

          <Grid item xs={12}>
            <AvatarUpload
              imagePreview={displayImagePreview}
              imageError={imageError}
              isUploading={isUploading}
              onImageChange={handleImageChangeWrapper}
              onDeleteImage={handleResetImage}
            />
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          <Grid item xs={12}>
            <ProfileFormSection
              icon={<PersonOutline />}
              title="Основные данные"
            />
          </Grid>

          <Grid item xs={12}>
            <Controller
              name="login"
              control={control}
              rules={{
                required: "Введите логин",
                minLength: { value: 2, message: "Минимум 2 символа" },
                maxLength: { value: 30, message: "Максимум 30 символов" },
                pattern: {
                  value: /^[a-zA-Z0-9_.-]+$/,
                  message: "Только латинские буквы, цифры и символы _.-",
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Логин"
                  placeholder="misterBob"
                  error={!!errors.login}
                  helperText={errors.login?.message}
                  autoComplete="username"
                />
              )}
            />
          </Grid>

          <Grid item xs={12}>
            <Controller
              name="fullName"
              control={control}
              rules={{
                required: "Введите имя",
                minLength: { value: 2, message: "Минимум 2 символа" },
                maxLength: { value: 100, message: "Максимум 100 символов" },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Имя и фамилия"
                  placeholder="Иван Иванов"
                  error={!!errors.fullName}
                  helperText={errors.fullName?.message}
                  autoComplete="name"
                />
              )}
            />
          </Grid>

          <Grid item xs={12}>
            <Controller
              name="phoneNumber"
              control={control}
              rules={{
                pattern: {
                  value:
                    /^(\+7|8)[\s\-]?\(?[0-9]{3}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/,
                  message: "Некорректный номер телефона",
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Телефон"
                  placeholder="+7 (999) 123-45-67"
                  error={!!errors.phoneNumber}
                  helperText={errors.phoneNumber?.message}
                  inputProps={{ inputMode: "tel" }}
                  autoComplete="tel"
                />
              )}
            />
          </Grid>

          <Grid item xs={12}>
            <Box
              sx={{
                mt: 0.5,
                p: { xs: 1.5, sm: 2 },
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                bgcolor: alpha(theme.palette.primary.main, 0.035),
              }}
            >
              <Stack spacing={1.5}>
                <Typography
                  variant={isMobile ? "caption" : "body2"}
                  color="text.secondary"
                >
                  {statusText}
                </Typography>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={isLoading || !isFormChanged}
                  sx={{
                    py: { xs: 1.3, sm: 1.6 },
                    fontWeight: 700,
                  }}
                >
                  {isLoading ? (
                    <>
                      <CircularProgress
                        size={22}
                        sx={{ mr: 1 }}
                        color="inherit"
                      />
                      {isUploading ? "Загружаем фото..." : "Сохраняем..."}
                    </>
                  ) : (
                    "Сохранить изменения"
                  )}
                </Button>
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};
