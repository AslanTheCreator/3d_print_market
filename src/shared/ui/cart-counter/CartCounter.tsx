"use client";

import React from "react";
import { Box, Typography, useTheme, useMediaQuery, alpha } from "@mui/material";
import { Add, Remove } from "@mui/icons-material";

interface CartCounterProps {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
  isAtMax?: boolean;
}

export const CartCounter: React.FC<CartCounterProps> = ({
  value,
  onIncrement,
  onDecrement,
  disabled = false,
  isAtMax = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      onDecrement();
    }
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isAtMax) {
      onIncrement();
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        height: isMobile ? 32 : 36,
        bgcolor: alpha(theme.palette.primary.main, 0.1),
        borderRadius: isMobile ? 1 : 1.5,
        overflow: "hidden",
        opacity: disabled ? 0.6 : 1,
        transition: "all 0.2s ease-in-out",
      }}
    >
      {/* Кнопка минус */}
      <Box
        onClick={handleDecrement}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: isMobile ? 36 : 44,
          height: "100%",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "background-color 0.15s ease",
          "&:hover": {
            bgcolor: disabled
              ? "transparent"
              : alpha(theme.palette.primary.main, 0.15),
          },
          "&:active": {
            bgcolor: disabled
              ? "transparent"
              : alpha(theme.palette.primary.main, 0.25),
          },
        }}
      >
        <Remove
          sx={{
            fontSize: isMobile ? "1.125rem" : "1.25rem",
            color: theme.palette.primary.main,
          }}
        />
      </Box>

      {/* Значение счётчика */}
      <Typography
        sx={{
          flex: 1,
          textAlign: "center",
          fontWeight: 700,
          fontSize: isMobile ? "0.875rem" : "1rem",
          color: theme.palette.primary.main,
          userSelect: "none",
        }}
      >
        {value}
      </Typography>

      {/* Кнопка плюс */}
      <Box
        onClick={handleIncrement}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: isMobile ? 36 : 44,
          height: "100%",
          cursor: disabled || isAtMax ? "not-allowed" : "pointer",
          opacity: isAtMax ? 0.5 : 1,
          transition: "background-color 0.15s ease",
          "&:hover": {
            bgcolor:
              disabled || isAtMax
                ? "transparent"
                : alpha(theme.palette.primary.main, 0.15),
          },
          "&:active": {
            bgcolor:
              disabled || isAtMax
                ? "transparent"
                : alpha(theme.palette.primary.main, 0.25),
          },
        }}
      >
        <Add
          sx={{
            fontSize: isMobile ? "1.125rem" : "1.25rem",
            color: theme.palette.primary.main,
          }}
        />
      </Box>
    </Box>
  );
};
