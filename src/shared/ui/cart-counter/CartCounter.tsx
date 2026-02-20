// src/shared/ui/cart-counter/CartCounter.tsx

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
  size?: "compact" | "large";
}

const sizeConfig = {
  compact: {
    height: { mobile: 32, desktop: 36 },
    buttonWidth: { mobile: 36, desktop: 44 },
    iconSize: { mobile: "1.125rem", desktop: "1.25rem" },
    fontSize: { mobile: "0.875rem", desktop: "1rem" },
    borderRadius: { mobile: 1, desktop: 1.5 },
  },
  large: {
    height: { mobile: 44, desktop: 48 },
    buttonWidth: { mobile: 44, desktop: 52 },
    iconSize: { mobile: "1.25rem", desktop: "1.375rem" },
    fontSize: { mobile: "1rem", desktop: "1.125rem" },
    borderRadius: { mobile: 2, desktop: 3 },
  },
};

export const CartCounter: React.FC<CartCounterProps> = ({
  value,
  onIncrement,
  onDecrement,
  disabled = false,
  isAtMax = false,
  size = "compact",
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const device = isMobile ? "mobile" : "desktop";
  const config = sizeConfig[size];

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
        height: config.height[device],
        bgcolor: alpha(theme.palette.primary.main, 0.1),
        borderRadius: config.borderRadius[device],
        overflow: "hidden",
        opacity: disabled ? 0.6 : 1,
        transition: "all 0.2s ease-in-out",
      }}
    >
      <Box
        onClick={handleDecrement}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: config.buttonWidth[device],
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
            fontSize: config.iconSize[device],
            color: theme.palette.primary.main,
          }}
        />
      </Box>

      <Typography
        sx={{
          flex: 1,
          textAlign: "center",
          fontWeight: 700,
          fontSize: config.fontSize[device],
          color: theme.palette.primary.main,
          userSelect: "none",
        }}
      >
        {value}
      </Typography>

      <Box
        onClick={handleIncrement}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: config.buttonWidth[device],
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
            fontSize: config.iconSize[device],
            color: theme.palette.primary.main,
          }}
        />
      </Box>
    </Box>
  );
};
