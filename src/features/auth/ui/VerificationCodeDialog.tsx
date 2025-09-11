"use client";

import React, { useState, useRef, KeyboardEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  useMediaQuery,
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
  email: string;
  isLoading?: boolean;
}

export const VerificationCodeDialog: React.FC<VerificationCodeDialogProps> = ({
  open,
  onClose,
  onVerify,
  email,
  isLoading = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [code, setCode] = useState(["", "", "", "", ""]);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Только цифры

    const newCode = [...code];
    newCode[index] = value.slice(-1); // Берем только последний символ
    setCode(newCode);
    setError("");

    // Автоматический переход к следующему полю
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
      // Очищаем поля при ошибке
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  };

  const handleClose = () => {
    setCode(["", "", "", "", "", ""]);
    setError("");
    onClose();
  };

  const isCodeComplete = code.every((digit) => digit !== "");

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
          mx: isMobile ? 2 : 3,
          my: isMobile ? 2 : 3,
        },
      }}
    >
      {/* Close button */}
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
          p: isMobile ? 3 : 4,
          pb: isMobile ? 2 : 3,
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
              width: isMobile ? 64 : 80,
              height: isMobile ? 64 : 80,
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
                fontSize: isMobile ? 28 : 36,
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

        {/* Title */}
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            mb: 1.5,
            color: theme.palette.text.primary,
            fontSize: isMobile ? "1.25rem" : "1.5rem",
          }}
        >
          Подтверждение email
        </Typography>

        {/* Description */}
        <Typography
          variant="body1"
          sx={{
            color: theme.palette.text.secondary,
            mb: 3,
            lineHeight: 1.6,
            fontSize: isMobile ? "0.875rem" : "1rem",
          }}
        >
          Мы отправили код подтверждения на
          <br />
          <strong>{email}</strong>
        </Typography>

        {/* Code Input */}
        <Box
          sx={{
            display: "flex",
            gap: isMobile ? 1 : 1.5,
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
                style: {
                  textAlign: "center",
                  fontSize: isMobile ? "1.25rem" : "1.5rem",
                  fontWeight: 600,
                  padding: isMobile ? "12px 8px" : "16px 12px",
                },
              }}
              sx={{
                width: isMobile ? 40 : 48,
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
              }}
              error={!!error}
            />
          ))}
        </Box>

        {/* Error message */}
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
      </DialogContent>

      <DialogActions
        sx={{
          p: isMobile ? 3 : 4,
          pt: 0,
          gap: 1.5,
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        <Button
          onClick={handleClose}
          variant="outlined"
          fullWidth={isMobile}
          sx={{
            borderRadius: "12px",
            py: 1.25,
            px: 3,
            fontSize: isMobile ? "0.875rem" : "1rem",
            fontWeight: 600,
            order: isMobile ? 2 : 1,
            minWidth: isMobile ? "auto" : 120,
          }}
        >
          Отмена
        </Button>
        <Button
          onClick={handleVerify}
          variant="contained"
          fullWidth={isMobile}
          disabled={!isCodeComplete || isLoading}
          sx={{
            borderRadius: "12px",
            py: 1.25,
            px: 3,
            fontSize: isMobile ? "0.875rem" : "1rem",
            fontWeight: 600,
            order: isMobile ? 1 : 2,
            minWidth: isMobile ? "auto" : 140,
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
