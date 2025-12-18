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
import { useUpdateUser } from "@/entities/user";

interface ProfileFormValues {
  fullName: string;
  phoneNumber: string;
}

interface ProfileFormProps {
  initialData?: Partial<ProfileFormValues>;
  onBack: () => void;
  onSuccess?: () => void;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({
  initialData = {},
  onBack,
  onSuccess,
}) => {
  const { mutateAsync, isPending } = useUpdateUser();

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
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    defaultValues: {
      fullName: initialData.fullName ?? "",
      phoneNumber: initialData.phoneNumber ?? "",
    },
  });

  const isLoading = isPending || isUploading;

  const onSubmit = async (data: ProfileFormValues) => {
    await mutateAsync({
      ...data,
      imageIds: imageIds.length ? imageIds : [],
      deadlineSending: 0,
      deadlinePayment: 0,
      login: "", // ?
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
              imagePreview={imagePreview}
              imageError={imageError}
              isUploading={isUploading}
              onImageChange={handleImageChange}
              onDeleteImage={resetImageState}
            />
          </Grid>

          <Grid item xs={12}>
            <Controller
              name="fullName"
              control={control}
              rules={{
                required: "Введите имя",
                minLength: { value: 2, message: "Минимум 2 символа" },
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
              disabled={isLoading || !isDirty}
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
