"use client";

import React, {
  useState,
  useRef,
  KeyboardEvent,
  useEffect,
  useId,
} from "react";
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
import { Email, CheckCircle } from "@mui/icons-material";
import { ApiError } from "@/shared/lib/errorHandler";
import { AuthDialog, authDialogActionsSx, authDialogContentSx } from "./AuthDialog";

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
  const titleId = useId();
  const errorId = useId();
  const formId = useId();

  const [code, setCode] = useState(["", "", "", "", ""]);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState<number>(0);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
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
    if (value.length === 5) {
      setCode(value.split(""));
      setError("");
      inputRefs.current[4]?.focus();
      return;
    }

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
    if (isLoading || isResending) return;
    const fullCode = code.join("");

    if (fullCode.length !== 5) {
      setError("Введите полный код из 5 цифр");
      return;
    }

    try {
      await onVerify(fullCode);
    } catch (error) {
      setError(error instanceof ApiError && (error.isServerError() || error.code === "NETWORK_ERROR")
        ? "Не удалось проверить код. Попробуйте ещё раз"
        : "Неверный код. Попробуйте еще раз");
      requestAnimationFrame(() => inputRefs.current[0]?.focus());
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || isResending || isLoading) return;
    setIsResending(true);
    setError("");
    setResendMessage("");

    try {
      const result = await onResendCode();

      if (result.success) {
        setCode(["", "", "", "", ""]);
        setResendMessage("Код отправлен повторно");
        requestAnimationFrame(() => inputRefs.current[0]?.focus());
      } else if (result.retryAfterSec) {
        setCountdown(result.retryAfterSec);
      } else {
        setError("Не удалось отправить код. Попробуйте ещё раз");
      }
    } catch (error) {
      setError("Ошибка при отправке кода. Попробуйте позже");
    } finally {
      setIsResending(false);
    }
  };

  const handleClose = () => {
    if (isLoading || isResending) return;
    setCode(["", "", "", "", ""]);
    setError("");
    setCountdown(0);
    setResendMessage("");
    onClose();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isCodeComplete = code.every((digit) => digit !== "");
  const isResendDisabled = countdown > 0 || isResending || isLoading;

  return (
    <AuthDialog
      open={open}
      onClose={handleClose}
      titleId={titleId}
      closeLabel="Закрыть окно подтверждения email"
      busy={isLoading || isResending}
    >
      <DialogContent sx={authDialogContentSx}>
        <Box component="form" id={formId} onSubmit={(event) => { event.preventDefault(); void handleVerify(); }}>
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
            <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>Подтвердите почту</Box>
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>Подтверждение email</Box>
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: theme.palette.text.secondary,
              mb: { xs: 2.5, sm: 3 },
              lineHeight: 1.6,
              fontSize: { xs: "0.875rem", sm: "1rem" },
            }}
          >
            <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>Код из 5 цифр отправлен на</Box>
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>Мы отправили код подтверждения на</Box>
            <br />
            <Box component="strong" sx={{ overflowWrap: "anywhere", color: { xs: "text.primary", sm: "inherit" } }}>{email}</Box>
          </Typography>

          <Box
            role="group"
            aria-label="Код подтверждения"
            aria-describedby={error ? errorId : undefined}
            sx={{
              display: "flex",
              gap: { xs: 1, sm: 1.5 },
              justifyContent: { xs: "space-between", sm: "center" },
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
                onPaste={handlePaste}
                disabled={isLoading || isResending}
                inputProps={{
                  maxLength: 5,
                  inputMode: "numeric",
                  autoComplete: index === 0 ? "one-time-code" : "off",
                  "aria-label": `Цифра ${index + 1} из 5`,
                  "aria-describedby": error ? errorId : undefined,
                  "aria-invalid": !!error,
                }}
                sx={{
                  width: { xs: "calc((100% - 32px) / 5)", sm: 48 },
                  minWidth: { xs: 44, sm: 48 },
                  maxWidth: { xs: 64, sm: 48 },
                  flexShrink: 0,
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
              id={errorId}
              role="alert"
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
                display: { xs: "none", sm: "block" },
                mb: 2,
                fontSize: "0.75rem",
              }}
            >
              Повторная отправка доступна через {formatTime(countdown)}
            </Typography>
          )}
          <Typography role="status" variant="caption" color="text.secondary" sx={{ display: { xs: "block", sm: "none" } }}>
            {resendMessage}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={authDialogActionsSx}>
        <Button
          type="submit"
          form={formId}
          aria-label="Подтвердить"
          aria-busy={isLoading}
          variant="contained"
          disabled={!isCodeComplete || isLoading || isResending}
          sx={{
            width: { xs: "100%", sm: "auto" },
            borderRadius: "12px",
            py: 1.25,
            px: 3,
            fontSize: { xs: "0.875rem", sm: "1rem" },
            fontWeight: 600,
            order: { xs: 1, sm: 2 },
            ml: { xs: 0, sm: 1 },
            minWidth: { xs: "auto", sm: 140 },
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
            "Подтвердить"
          )}
        </Button>
        <Button
          onClick={handleResend}
          variant="outlined"
          aria-label="Отправить повторно"
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
            [theme.breakpoints.down("sm")]: {
              border: "1px solid transparent",
              fontWeight: 500,
              "&:hover": { borderColor: "transparent", bgcolor: "action.hover" },
              "&.Mui-disabled": { borderColor: "transparent" },
            },
          }}
        >
          {isResending ? (
            <CircularProgress size={20} color="inherit" />
          ) : countdown > 0 ? (
            <>
              <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>Повторить через {formatTime(countdown)}</Box>
              <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>Повторно</Box>
            </>
          ) : (
            "Отправить повторно"
          )}
        </Button>
      </DialogActions>
    </AuthDialog>
  );
};
