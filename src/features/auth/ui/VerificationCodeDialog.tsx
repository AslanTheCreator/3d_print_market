"use client";

import React, { useState, useRef, KeyboardEvent, useEffect } from "react";
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
import { Close as CloseIcon, Email, CheckCircle } from "@mui/icons-material";

interface VerificationCodeDialogProps {
  open: boolean;
  onClose: () => void;
  onVerify: (code: string) => Promise<void>;
  onResendCode: () => Promise<{ success: boolean; retryAfterSec?: number }>;
  email: string;
  isLoading?: boolean;
}

export const VerificationCodeDialog: React.FC<VerificationCodeDialogProps> = ({
  open,
  onClose,
  onVerify,
  onResendCode,
  email,
  isLoading = false,
}) => {
  const theme = useTheme();

  const [code, setCode] = useState(["", "", "", "", ""]);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState<number>(0);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown таймер
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError("");

    if (value && index < 4) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 5);

    if (pastedData.length === 5) {
      const newCode = pastedData.split("");
      setCode(newCode);
      setError("");
      inputRefs.current[4]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join("");

    if (fullCode.length !== 5) {
      setError("Введите полный код из 5 цифр");
      return;
    }

    try {
      await onVerify(fullCode);
    } catch (error) {
      setError("Неверный код. Попробуйте еще раз");
      setCode(["", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError("");

    try {
      const result = await onResendCode();

      if (result.success) {
        setCode(["", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else if (result.retryAfterSec) {
        setCountdown(result.retryAfterSec);
        setError(
          `Слишком много запросов. Повторите попытку через ${result.retryAfterSec} секунд`
        );
      }
    } catch (error) {
      setError("Ошибка при отправке кода. Попробуйте позже");
    } finally {
      setIsResending(false);
    }
  };

  const handleClose = () => {
    setCode(["", "", "", "", ""]);
    setError("");
    setCountdown(0);
    onClose();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isCodeComplete = code.every((digit) => digit !== "");
  const isResendDisabled = countdown > 0 || isResending;

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
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <Email
              sx={{
                fontSize: { xs: 28, sm: 36 },
                color: theme.palette.primary.main,
              }}
            />
            <Box
              sx={{
                position: "absolute",
                top: -4,
                right: -4,
                width: 24,
                height: 24,
                borderRadius: "50%",
                backgroundColor: theme.palette.success.main,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `2px solid ${theme.palette.background.paper}`,
              }}
            >
              <CheckCircle
                sx={{
                  color: "white",
                  fontSize: 16,
                }}
              />
            </Box>
          </Box>
        </Box>

        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            mb: 1.5,
            color: theme.palette.text.primary,
            fontSize: { xs: "1.25rem", sm: "1.5rem" },
          }}
        >
          Подтверждение email
        </Typography>

        <Typography
          variant="body1"
          sx={{
            color: theme.palette.text.secondary,
            mb: 3,
            lineHeight: 1.6,
            fontSize: { xs: "0.875rem", sm: "1rem" },
          }}
        >
          Мы отправили код подтверждения на
          <br />
          <strong>{email}</strong>
        </Typography>

        <Box
          sx={{
            display: "flex",
            gap: { xs: 1, sm: 1.5 },
            justifyContent: "center",
            mb: 2,
          }}
        >
          {code.map((digit, index) => (
            <TextField
              key={index}
              inputRef={(el) => (inputRefs.current[index] = el)}
              value={digit}
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                handleKeyDown(index, e)
              }
              onPaste={index === 0 ? handlePaste : undefined}
              inputProps={{
                maxLength: 1,
              }}
              sx={{
                width: { xs: 40, sm: 48 },
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                  "&.Mui-focused": {
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: theme.palette.primary.main,
                      borderWidth: 2,
                    },
                  },
                  "&.Mui-error": {
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: theme.palette.error.main,
                    },
                  },
                },
                "& .MuiInputBase-input": {
                  textAlign: "center",
                  fontSize: { xs: "1.25rem", sm: "1.5rem" },
                  fontWeight: 600,
                  padding: { xs: "12px 8px", sm: "16px 12px" },
                },
              }}
              error={!!error}
            />
          ))}
        </Box>

        {error && (
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.error.main,
              display: "block",
              mb: 2,
              fontSize: "0.75rem",
            }}
          >
            {error}
          </Typography>
        )}

        {countdown > 0 && (
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.text.secondary,
              display: "block",
              mb: 2,
              fontSize: "0.75rem",
            }}
          >
            Повторная отправка доступна через {formatTime(countdown)}
          </Typography>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          p: { xs: 3, sm: 4 },
          pt: 0,
          gap: 1.5,
          flexDirection: { xs: "column", sm: "row" },
        }}
      >
        <Button
          onClick={handleResend}
          variant="outlined"
          disabled={isResendDisabled}
          sx={{
            width: { xs: "100%", sm: "auto" },
            borderRadius: "12px",
            py: 1.25,
            px: 3,
            fontSize: { xs: "0.875rem", sm: "1rem" },
            fontWeight: 600,
            order: { xs: 2, sm: 1 },
            minWidth: { xs: "auto", sm: 120 },
            position: "relative",
          }}
        >
          {isResending ? (
            <CircularProgress size={20} color="inherit" />
          ) : countdown > 0 ? (
            `Повторно`
          ) : (
            "Отправить повторно"
          )}
        </Button>
        <Button
          onClick={handleVerify}
          variant="contained"
          disabled={!isCodeComplete || isLoading}
          sx={{
            width: { xs: "100%", sm: "auto" },
            borderRadius: "12px",
            py: 1.25,
            px: 3,
            fontSize: { xs: "0.875rem", sm: "1rem" },
            fontWeight: 600,
            order: { xs: 1, sm: 2 },
            minWidth: { xs: "auto", sm: 140 },
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
            "Подтвердить"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
