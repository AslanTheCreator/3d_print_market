"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  useTheme,
  alpha,
  TextField,
  CircularProgress,
} from "@mui/material";
import {
  Close as CloseIcon,
  LockReset,
  CheckCircle,
  Email as EmailIcon,
} from "@mui/icons-material";

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

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async () => {
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
    } catch (error: any) {
      setError(error?.message || "Ошибка при отправке. Попробуйте позже");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setError("");
    setIsSuccess(false);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      handleSubmit();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "16px",
          overflow: "visible",
          position: "relative",
          mx: { xs: 2, sm: 3 },
          my: { xs: 2, sm: 3 },
        },
      }}
    >
      <IconButton
        onClick={handleClose}
        sx={{
          position: "absolute",
          right: 8,
          top: 8,
          color: theme.palette.grey[400],
          "&:hover": {
            backgroundColor: alpha(theme.palette.grey[400], 0.1),
          },
          zIndex: 1,
        }}
      >
        <CloseIcon />
      </IconButton>

      <DialogContent
        sx={{
          p: { xs: 3, sm: 4 },
          pb: { xs: 2, sm: 3 },
          textAlign: "center",
        }}
      >
        {/* Icon */}
        <Box
          sx={{
            display: "flex",
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
          variant="h5"
          sx={{
            fontWeight: 700,
            mb: 1.5,
            color: theme.palette.text.primary,
            fontSize: { xs: "1.25rem", sm: "1.5rem" },
          }}
        >
          {isSuccess ? "Проверьте почту" : "Забыли пароль?"}
        </Typography>

        {/* Description */}
        <Typography
          variant="body1"
          sx={{
            color: theme.palette.text.secondary,
            mb: 3,
            lineHeight: 1.6,
            fontSize: { xs: "0.875rem", sm: "1rem" },
          }}
        >
          {isSuccess ? (
            <>
              Временный пароль отправлен на
              <br />
              <strong>{email}</strong>
              <br />
              <Box sx={{ mt: 2 }}>Используйте его для входа в систему</Box>
            </>
          ) : (
            "Введите email, привязанный к вашей учетной записи, и мы отправим вам временный пароль"
          )}
        </Typography>

        {/* Email Input */}
        {!isSuccess && (
          <TextField
            fullWidth
            type="email"
            label="Email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            onKeyPress={handleKeyPress}
            error={!!error}
            helperText={error}
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
      </DialogContent>

      <DialogActions
        sx={{
          p: { xs: 3, sm: 4 },
          pt: 0,
          gap: 1.5,
          flexDirection: { xs: "column", sm: "row" },
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
              boxShadow: "0 4px 16px rgba(239, 66, 132, 0.3)",
              "&:hover": {
                boxShadow: "0 6px 20px rgba(239, 66, 132, 0.4)",
                transform: "translateY(-1px)",
              },
              transition: "all 0.2s ease-in-out",
            }}
          >
            Понятно
          </Button>
        ) : (
          <>
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
              }}
            >
              Отмена
            </Button>
            <Button
              onClick={handleSubmit}
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
                minWidth: { xs: "auto", sm: 180 },
                boxShadow: "0 4px 16px rgba(239, 66, 132, 0.3)",
                "&:hover": {
                  boxShadow: "0 6px 20px rgba(239, 66, 132, 0.4)",
                  transform: "translateY(-1px)",
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
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};
