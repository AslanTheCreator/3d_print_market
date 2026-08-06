"use client";

import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Stack,
  InputAdornment,
  IconButton,
  alpha,
  useTheme,
  CircularProgress,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Lock,
  CheckCircleOutline,
} from "@mui/icons-material";
import { useChangePassword } from "@/entities/user";
import { useNotification } from "@/shared/ui/notification";

interface PasswordFormData {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const ChangePasswordForm: React.FC = () => {
  const theme = useTheme();
  const { mutate: changePassword, isPending } = useChangePassword();
  const { showNotification } = useNotification();

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<PasswordFormData>({
    defaultValues: {
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const newPassword = watch("newPassword");

  const onSubmit = (data: PasswordFormData) => {
    changePassword(
      {
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
      },
      {
        onSuccess: () => {
          reset();
          showNotification("Пароль успешно изменён", "success");
        },
        onError: (error) => {
          const msg =
            error instanceof Error
              ? error.message
              : "Не удалось изменить пароль";
          showNotification(msg, "error");
        },
      },
    );
  };

  const passwordRules = [
    {
      label: "Минимум 6 символов",
      test: (val: string) => val.length >= 6,
    },
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          background: `linear-gradient(135deg, ${alpha(
            theme.palette.primary.main,
            0.05,
          )}, ${alpha(theme.palette.secondary.main, 0.05)})`,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Lock sx={{ color: theme.palette.primary.main }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Смена пароля
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Введите текущий пароль и задайте новый
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Form */}
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{ p: { xs: 2, sm: 3 } }}
      >
        <Stack spacing={3}>
          {/* Старый пароль */}
          <Controller
            name="oldPassword"
            control={control}
            rules={{
              required: "Введите текущий пароль",
            }}
            render={({ field }) => (
              <TextField
                {...field}
                label="Текущий пароль"
                type={showOldPassword ? "text" : "password"}
                error={!!errors.oldPassword}
                helperText={errors.oldPassword?.message}
                fullWidth
                disabled={isPending}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        type="button"
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        edge="end"
                        size="small"
                        aria-label={
                          showOldPassword
                            ? "Скрыть текущий пароль"
                            : "Показать текущий пароль"
                        }
                        aria-pressed={showOldPassword}
                      >
                        {showOldPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            )}
          />

          {/* Новый пароль */}
          <Controller
            name="newPassword"
            control={control}
            rules={{
              required: "Введите новый пароль",
              minLength: {
                value: 6,
                message: "Пароль должен содержать минимум 6 символов",
              },
              validate: (value) =>
                value !== watch("oldPassword") ||
                "Новый пароль должен отличаться от текущего",
            }}
            render={({ field }) => (
              <TextField
                {...field}
                label="Новый пароль"
                type={showNewPassword ? "text" : "password"}
                error={!!errors.newPassword}
                helperText={errors.newPassword?.message}
                fullWidth
                disabled={isPending}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        edge="end"
                        size="small"
                        aria-label={
                          showNewPassword
                            ? "Скрыть новый пароль"
                            : "Показать новый пароль"
                        }
                        aria-pressed={showNewPassword}
                      >
                        {showNewPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            )}
          />

          {/* Индикаторы требований к паролю */}
          {newPassword && (
            <Stack spacing={0.5}>
              {passwordRules.map((rule, index) => {
                const passed = rule.test(newPassword);
                return (
                  <Stack
                    key={index}
                    direction="row"
                    spacing={1}
                    alignItems="center"
                  >
                    <CheckCircleOutline
                      sx={{
                        fontSize: 16,
                        color: passed
                          ? theme.palette.success.main
                          : theme.palette.text.disabled,
                      }}
                    />
                    <Typography
                      variant="caption"
                      color={passed ? "success.main" : "text.secondary"}
                    >
                      {rule.label}
                    </Typography>
                  </Stack>
                );
              })}
            </Stack>
          )}

          {/* Подтверждение */}
          <Controller
            name="confirmPassword"
            control={control}
            rules={{
              required: "Подтвердите новый пароль",
              validate: (value) =>
                value === newPassword || "Пароли не совпадают",
            }}
            render={({ field }) => (
              <TextField
                {...field}
                label="Подтвердите новый пароль"
                type={showConfirmPassword ? "text" : "password"}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
                fullWidth
                disabled={isPending}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        edge="end"
                        size="small"
                        aria-label={
                          showConfirmPassword
                            ? "Скрыть подтверждение нового пароля"
                            : "Показать подтверждение нового пароля"
                        }
                        aria-pressed={showConfirmPassword}
                      >
                        {showConfirmPassword ? (
                          <VisibilityOff />
                        ) : (
                          <Visibility />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            )}
          />

          {/* Кнопка отправки */}
          <Box sx={{ display: "flex", justifyContent: "flex-end", pt: 1 }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={isPending || !isDirty}
              sx={{ minWidth: { xs: "100%", sm: 180 } }}
              startIcon={isPending ? <CircularProgress size={16} /> : undefined}
            >
              {isPending ? "Сохранение..." : "Изменить пароль"}
            </Button>
          </Box>
        </Stack>
      </Box>
    </Paper>
  );
};
