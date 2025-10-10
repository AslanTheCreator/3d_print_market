import { useForm, Controller } from "react-hook-form";
import { Grid, TextField, Button, CircularProgress, Box } from "@mui/material";
import { useState } from "react";
import { useUpdateUser } from "@/entities/user";
import { AvatarUpload } from "@/shared/ui/avatar-upload";
import { useImageUpload } from "@/features/image-upload";
import { Notification } from "@/shared/ui/notification";
import { useNotification } from "@/app/providers";

interface ProfileFormValues {
  fullName: string;
  phoneNumber: string;
}

export const ProfileForm: React.FC = () => {
  const [isPending, setIsPending] = useState(false);
  const { showNotification } = useNotification();

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

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      setIsPending(true);
      const updateData = {
        ...data,
        imageIds: imageIds.length ? imageIds : [0],
        deadlineSending: 0,
        deadlinePayment: 0,
        login: "",
      };
      await mutateAsync(updateData);
      showNotification("Профиль успешно обновлен", "success");
    } catch (error) {
      showNotification("Ошибка при обновлении профиля", "error");
      console.error("Ошибка при обновлении профиля:", error);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Grid container spacing={3}>
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
                  <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                  {isUploading ? "Загрузка изображения..." : "Сохранение..."}
                </>
              ) : (
                "Сохранить изменения"
              )}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </>
  );
};
