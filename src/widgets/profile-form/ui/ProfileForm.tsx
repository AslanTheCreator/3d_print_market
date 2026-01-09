"use client";

import { useForm, Controller } from "react-hook-form";
import {
  Paper,
  Box,
  IconButton,
  Typography,
  Grid,
  TextField,
  Button,
  CircularProgress,
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { AvatarUpload } from "@/shared/ui/avatar-upload";
import { useImageUpload } from "@/features/image-upload";
import { useUpdateUser, UserBaseModel } from "@/entities/user";
import { useState, useEffect } from "react";

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
  const { mutateAsync, isPending } = useUpdateUser();
  const [hasImageChanged, setHasImageChanged] = useState(false);
  const [currentImageId, setCurrentImageId] = useState<number | null>(
    initialData?.imageId ?? null
  );

  const {
    imagePreview,
    imageError,
    imageIds,
    isUploading,
    handleImageChange,
    resetImageState,
  } = useImageUpload("PARTICIPANT");

  // Получаем текущее изображение пользователя для preview
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

  // Обновляем ID изображения при загрузке нового
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

  // Используем новое изображение если оно загружено, иначе существующее
  const displayImagePreview = imagePreview || existingImagePreview;

  const onSubmit = async (data: ProfileFormValues) => {
    await mutateAsync({
      ...data,
      imageId: currentImageId,
      deadlineSending: 0,
      deadlinePayment: 0,
    });
    onSuccess?.();
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: { xs: 2, sm: 3, md: 4 },
        borderRadius: 3,
        mx: "auto",
        maxWidth: 640,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <IconButton onClick={onBack} edge="start" sx={{ mr: 1 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1" fontWeight={700}>
          Личные данные
        </Typography>
      </Box>

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Grid container spacing={{ xs: 2, md: 3 }}>
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
                  label="Номер телефона"
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
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading || !isFormChanged}
              sx={{ mt: 2, py: 1.75, fontWeight: 700 }}
            >
              {isLoading ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1 }} color="inherit" />
                  {isUploading ? "Загружаем фото..." : "Сохраняем..."}
                </>
              ) : (
                "Сохранить изменения"
              )}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};
