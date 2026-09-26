"use client";

import React, { useId, useState } from "react";
import {
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  useTheme,
  alpha,
  TextField,
  CircularProgress,
} from "@mui/material";
import {
  LockReset,
  CheckCircle,
  Email as EmailIcon,
} from "@mui/icons-material";
import { AuthDialog, authDialogActionsSx, authDialogContentSx } from "./AuthDialog";

interface PasswordResetDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (email: string) => Promise<void>;
}

export const PasswordResetDialog: React.FC<PasswordResetDialogProps> = ({
  open,
  onClose,
  onSubmit,
}) => {
  const theme = useTheme();
  const titleId = useId();
  const formId = useId();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async () => {
    if (isLoading) return;
    setError("");

    if (!email.trim()) {
      setError("Введите email");
      return;
    }

    if (!validateEmail(email)) {
      setError("Введите корректный email");
      return;
    }

    try {
      setIsLoading(true);
      await onSubmit(email);
      setIsSuccess(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Ошибка при отправке. Попробуйте позже");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setEmail("");
    setError("");
    setIsSuccess(false);
    onClose();
  };

  return (
    <AuthDialog
      open={open}
      onClose={handleClose}
      titleId={titleId}
      closeLabel="Закрыть окно восстановления пароля"
      busy={isLoading}
    >
      <DialogContent sx={authDialogContentSx}>
        <Box component="form" id={formId} noValidate onSubmit={(event) => { event.preventDefault(); if (!isSuccess) void handleSubmit(); }}>
          {/* Icon */}
          <Box
            sx={{
              display: { xs: "none", sm: "flex" },
              justifyContent: "center",
              mb: 3,
            }}
          >
            <Box
              sx={{
                width: { xs: 64, sm: 80 },
                height: { xs: 64, sm: 80 },
                borderRadius: "50%",
                backgroundColor: alpha(
                  isSuccess
                    ? theme.palette.success.main
                    : theme.palette.primary.main,
                  0.1
                ),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isSuccess ? (
                <CheckCircle
                  sx={{
                    fontSize: { xs: 36, sm: 44 },
                    color: theme.palette.success.main,
                  }}
                />
              ) : (
                <LockReset
                  sx={{
                    fontSize: { xs: 28, sm: 36 },
                    color: theme.palette.primary.main,
                  }}
                />
              )}
            </Box>
          </Box>

          {/* Title */}
          <Typography
            id={titleId}
            variant="h5"
            sx={{
              fontWeight: 700,
              mb: 1.5,
              pr: { xs: 5, sm: 0 },
              color: theme.palette.text.primary,
              fontSize: { xs: "1.25rem", sm: "1.5rem" },
            }}
          >
            {isSuccess ? "Проверьте почту" : (
              <>
                <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>Восстановить пароль</Box>
                <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>Забыли пароль?</Box>
              </>
            )}
          </Typography>

          {/* Description */}
          <Typography
            variant="body1"
            sx={{
              color: theme.palette.text.secondary,
              mb: { xs: 2.5, sm: 3 },
              lineHeight: 1.6,
              fontSize: { xs: "0.875rem", sm: "1rem" },
            }}
          >
            {isSuccess ? (
              <>
                Временный пароль отправлен на
                <br />
                <Box component="strong" sx={{ overflowWrap: "anywhere" }}>{email}</Box>
                <br />
                <Box component="span" sx={{ mt: 2, display: "block" }}>Используйте его для входа в систему</Box>
              </>
            ) : (
              <>
                <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>Укажите почту аккаунта — отправим временный пароль.</Box>
                <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>Введите email, привязанный к вашей учетной записи, и мы отправим вам временный пароль</Box>
              </>
            )}
          </Typography>

          {/* Email Input */}
          {!isSuccess && (
            <TextField
              fullWidth
              type="email"
              autoComplete="email"
              inputProps={{ inputMode: "email", autoCapitalize: "none", spellCheck: false }}
              label="Email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              error={!!error}
              helperText={error}
              FormHelperTextProps={{ role: error ? "alert" : undefined }}
              disabled={isLoading}
              InputProps={{
                startAdornment: (
                  <EmailIcon
                    sx={{
                      color: theme.palette.text.secondary,
                      mr: 1,
                      fontSize: 20,
                    }}
                  />
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                },
              }}
            />
          )}
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          ...authDialogActionsSx,
          justifyContent: isSuccess ? "center" : "space-between",
        }}
      >
        {isSuccess ? (
          <Button
            onClick={handleClose}
            variant="contained"
            sx={{
              width: { xs: "100%", sm: "auto" },
              borderRadius: "12px",
              py: 1.25,
              px: 4,
              fontSize: { xs: "0.875rem", sm: "1rem" },
              fontWeight: 600,
              minWidth: { xs: "auto", sm: 200 },
              boxShadow: { xs: "none", sm: "0 4px 16px rgba(239, 66, 132, 0.3)" },
              "&:hover": {
                boxShadow: { xs: "none", sm: "0 6px 20px rgba(239, 66, 132, 0.4)" },
                transform: { xs: "none", sm: "translateY(-1px)" },
              },
              transition: "all 0.2s ease-in-out",
            }}
          >
            <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>Вернуться ко входу</Box>
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>Понятно</Box>
          </Button>
        ) : (
          <>
            <Button
              type="submit"
              form={formId}
              aria-label="Отправить пароль"
              aria-busy={isLoading}
              variant="contained"
              disabled={isLoading || !email.trim()}
              sx={{
                width: { xs: "100%", sm: "auto" },
                borderRadius: "12px",
                py: 1.25,
                px: 3,
                fontSize: { xs: "0.875rem", sm: "1rem" },
                fontWeight: 600,
                order: { xs: 1, sm: 2 },
                ml: { xs: 0, sm: 1 },
                minWidth: { xs: "auto", sm: 180 },
                boxShadow: { xs: "none", sm: "0 4px 16px rgba(239, 66, 132, 0.3)" },
                "&:hover": {
                  boxShadow: { xs: "none", sm: "0 6px 20px rgba(239, 66, 132, 0.4)" },
                  transform: { xs: "none", sm: "translateY(-1px)" },
                },
                "&:disabled": {
                  boxShadow: "none",
                  transform: "none",
                },
                transition: "all 0.2s ease-in-out",
                position: "relative",
              }}
            >
              {isLoading ? (
                <CircularProgress
                  size={24}
                  color="inherit"
                  sx={{ position: "absolute" }}
                />
              ) : (
                "Отправить пароль"
              )}
            </Button>
            <Button
              onClick={handleClose}
              variant="outlined"
              disabled={isLoading}
              sx={{
                width: { xs: "100%", sm: "auto" },
                borderRadius: "12px",
                py: 1.25,
                px: 3,
                fontSize: { xs: "0.875rem", sm: "1rem" },
                fontWeight: 600,
                order: { xs: 2, sm: 1 },
                minWidth: { xs: "auto", sm: 120 },
                [theme.breakpoints.down("sm")]: {
                  border: "1px solid transparent",
                  fontWeight: 500,
                  "&:hover": { borderColor: "transparent", bgcolor: "action.hover" },
                  "&.Mui-disabled": { borderColor: "transparent" },
                },
              }}
            >
              <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>Вернуться ко входу</Box>
              <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>Отмена</Box>
            </Button>
          </>
        )}
      </DialogActions>
    </AuthDialog>
  );
};
