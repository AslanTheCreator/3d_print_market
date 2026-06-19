"use client";

import { useForm, Controller } from "react-hook-form";
import {
  Paper,
  Box,
  Grid,
  TextField,
  Button,
  CircularProgress,
  useTheme,
  Typography,
  Stack,
} from "@mui/material";
import {
  BadgeOutlined,
  ManageAccountsRounded,
  PersonOutline,
} from "@mui/icons-material";
import { AvatarUpload } from "@/shared/ui/avatar-upload";
import { PageHeader } from "@/shared/ui/page-header";
import { useImageUpload } from "@/features/image-upload";
import { useUpdateUser, UserBaseModel } from "@/entities/user";
import { getImageUrl } from "@/shared/lib";
import { useNotification } from "@/shared/ui/notification";
import { useState, useEffect } from "react";
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
  const existingImagePreview = getImageUrl(existingImage, "medium") ?? null;

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
      const imageIdToDelete =
        hasImageChanged && currentImageId === null
          ? (initialData?.imageId ?? existingImage?.id)
          : undefined;

      await mutateAsync({
        userData: {
          ...data,
          imageId: hasImageChanged ? currentImageId : null,
          deadlineSending: 0,
          deadlinePayment: 0,
        },
        imageIdToDelete,
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
    <Box
      sx={{
        width: "100%",
        py: { xs: 2, sm: 3 },
        minWidth: 0,
      }}
    >
      <PageHeader
        title="Редактирование профиля"
        icon={<ManageAccountsRounded />}
        onBack={onBack}
      />

      <Paper
        elevation={0}
        sx={{
          borderRadius: 2,
          overflow: "hidden",
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container>
            <Grid
              item
              xs={12}
              md={4}
              sx={{
                p: { xs: 2, sm: 3 },
                pr: { md: 2 },
                minWidth: 0,
              }}
            >
              <Stack spacing={{ xs: 2, sm: 2.5 }}>
                <ProfileFormSection
                  icon={<BadgeOutlined />}
                  title="Фото профиля"
                />

                <AvatarUpload
                  imagePreview={displayImagePreview}
                  imageError={imageError}
                  isUploading={isUploading}
                  onImageChange={handleImageChangeWrapper}
                  onDeleteImage={handleResetImage}
                />
              </Stack>
            </Grid>

            <Grid
              item
              xs={12}
              md={8}
              sx={{
                p: { xs: 2, sm: 3 },
                pl: { md: 2 },
                minWidth: 0,
              }}
            >
              <Stack spacing={{ xs: 2, sm: 2.5 }}>
                <ProfileFormSection
                  icon={<PersonOutline />}
                  title="Основные данные"
                />

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
              </Stack>
            </Grid>

            <Grid
              item
              xs={12}
              sx={{ borderTop: "1px solid", borderColor: "divider" }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                alignItems={{ xs: "stretch", sm: "center" }}
                justifyContent="space-between"
                sx={{ p: { xs: 2, sm: 3 } }}
              >
                <Typography variant="body2" color="text.secondary">
                  {statusText}
                </Typography>

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={isLoading || !isFormChanged}
                  sx={{
                    width: { xs: "100%", sm: "auto" },
                    minWidth: { sm: 220 },
                    py: 1.25,
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
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Box>
  );
};
