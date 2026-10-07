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
  Alert,
} from "@mui/material";
import {
  BadgeOutlined,
  ManageAccountsRounded,
  PersonOutline,
} from "@mui/icons-material";
import { AvatarUpload } from "@/shared/ui/avatar-upload";
import { PageHeader } from "@/shared/ui/page-header";
import { useImageUpload, useImageCleanup } from "@/features/image-upload";
import { useUpdateUser, UserBaseModel } from "@/entities/user";
import { ImageMetadataFeedback, useImageMetadataQuery } from "@/entities/image";
import { getImageUrl, useUnsavedChanges } from "@/shared/lib";
import { useNotification } from "@/shared/ui/notification";
import { useState, useRef } from "react";
import { usePrivateScope } from "@/shared/lib/query";
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
  const [isSaved, setIsSaved] = useState(false);
  const savedRef = useRef(false);
  const savingRef = useRef(false);
  const scope = usePrivateScope();
  const imageCleanup = useImageCleanup("PARTICIPANT");

  const {
    imagePreview,
    imageError,
    imageState,
    getImageState,
    isUploading,
    handleImageChange,
    removeImage,
  } = useImageUpload("PARTICIPANT");

  const avatarQuery = useImageMetadataQuery(initialData?.imageId);
  const existingImage = avatarQuery.data?.find(image => image.id === initialData?.imageId);
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

  const handleImageChangeWrapper = (file: File) => {
    if (savedRef.current || savingRef.current) return;
    void handleImageChange(file);
  };

  const handleResetImage = () => {
    if (savedRef.current || savingRef.current) return;
    removeImage();
  };

  const isFormChanged = isDirty || imageState.selection.kind !== "unchanged";
  const isLoading = isPending || isUploading;
  const { confirmLeave, markSaved } = useUnsavedChanges(!isSaved && isFormChanged, isLoading || imageCleanup.isCleaning);
  const handleBack = () => { if (confirmLeave()) onBack(); };
  const displayImagePreview = imageState.selection.kind === "unchanged"
    ? existingImagePreview
    : imagePreview;

  const onSubmit = async (data: ProfileFormValues) => {
    const avatar = getImageState();
    if (savedRef.current || savingRef.current || avatar.status === "uploading" || !scope.isCurrent()) return;
    savingRef.current = true;
    let imageIdToDelete: number | undefined;
    try {
      imageIdToDelete =
        avatar.selection.kind === "explicitlyRemoved"
          ? (initialData?.imageId ?? existingImage?.id)
          : undefined;

      await mutateAsync({
        userData: {
          ...data,
          imageId: avatar.selection.kind === "uploaded" ? avatar.selection.id : null,
          deadlineSending: 0,
          deadlinePayment: 0,
        },
      });
    } catch (error) {
      if (!scope.isCurrent()) return;
      const msg =
        error instanceof Error
          ? error.message
          : "Не удалось сохранить изменения";
      showNotification(msg, "error");
      return;
    } finally {
      savingRef.current = false;
    }
    if (!scope.isCurrent()) return;
    savedRef.current = true;
    markSaved();
    setIsSaved(true);
    if (await imageCleanup.cleanup(imageIdToDelete === undefined ? [] : [imageIdToDelete])) {
      showNotification("Профиль успешно обновлён", "success");
      onSuccess?.();
    }
  };

  const retryImageCleanup = async () => {
    if (await imageCleanup.retry()) {
      showNotification("Профиль успешно обновлён", "success");
      onSuccess?.();
    }
  };

  const statusText = isSaved
    ? "Изменения сохранены."
    : isUploading
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
        onBack={handleBack}
      />

      {isSaved && (
        <Alert severity={imageCleanup.hasError ? "warning" : "success"} sx={{ mb: 2 }}
          action={imageCleanup.hasError ? (
            <Button disabled={imageCleanup.isCleaning} onClick={() => void retryImageCleanup()} sx={{ minHeight: 44 }}>
              Повторить очистку
            </Button>
          ) : undefined}
        >
          {imageCleanup.hasError
            ? "Профиль сохранён, очистка изображений не завершена."
            : "Профиль сохранён. Выполняется очистка изображений."}
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{
          borderRadius: 2,
          overflow: "hidden",
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Box component="fieldset" disabled={isSaved || isPending} sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
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
                {imageState.selection.kind === "unchanged" && <ImageMetadataFeedback query={avatarQuery} />}
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
                  render={({ field: { ref, ...field } }) => (
                    <TextField
                      {...field}
                      inputRef={ref}
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
                  render={({ field: { ref, ...field } }) => (
                    <TextField
                      {...field}
                      inputRef={ref}
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
                  render={({ field: { ref, ...field } }) => (
                    <TextField
                      {...field}
                      inputRef={ref}
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
                  disabled={isSaved || isLoading || !isFormChanged}
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
        </Box>
      </Paper>
    </Box>
  );
};
