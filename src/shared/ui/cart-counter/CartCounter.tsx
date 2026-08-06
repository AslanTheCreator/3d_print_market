// src/shared/ui/cart-counter/CartCounter.tsx

"use client";

import React from "react";
import {
  alpha,
  Box,
  IconButton,
  Typography,
  useTheme,
} from "@mui/material";
import { Add, Remove } from "@mui/icons-material";

interface CartCounterProps {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
  isAtMax?: boolean;
  size?: "compact" | "large";
  itemName?: string;
}

const sizeConfig = {
  compact: {
    height: { mobile: 44, desktop: 44 },
    buttonWidth: { mobile: 44, desktop: 44 },
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
  itemName,
}) => {
  const theme = useTheme();
  const config = sizeConfig[size];
  const accessibleItemName = itemName?.trim() || "товара";
  const counterLabel = itemName?.trim()
    ? `Количество товара «${accessibleItemName}»`
    : "Количество товара";

  const handleDecrement = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onDecrement();
  };

  const handleIncrement = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onIncrement();
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        height: { xs: config.height.mobile, sm: config.height.desktop },
        bgcolor: alpha(theme.palette.primary.main, 0.1),
        borderRadius: {
          xs: config.borderRadius.mobile,
          sm: config.borderRadius.desktop,
        },
        overflow: "hidden",
        opacity: disabled ? 0.6 : 1,
        transition: "all 0.2s ease-in-out",
      }}
      role="group"
      aria-label={counterLabel}
    >
      <IconButton
        type="button"
        onClick={handleDecrement}
        disabled={disabled}
        aria-label={`Уменьшить количество ${accessibleItemName}`}
        size="small"
        sx={{
          width: {
            xs: config.buttonWidth.mobile,
            sm: config.buttonWidth.desktop,
          },
          minWidth: 44,
          minHeight: 44,
          height: "100%",
          borderRadius: 0,
          color: theme.palette.primary.main,
          transition: "background-color 0.15s ease",
          "&:hover": {
            bgcolor: alpha(theme.palette.primary.main, 0.15),
          },
          "&:active": {
            bgcolor: alpha(theme.palette.primary.main, 0.25),
          },
          "&.Mui-disabled": {
            color: theme.palette.action.disabled,
          },
        }}
      >
        <Remove
          sx={{
            fontSize: {
              xs: config.iconSize.mobile,
              sm: config.iconSize.desktop,
            },
            color: "inherit",
          }}
        />
      </IconButton>

      <Typography
        sx={{
          flex: 1,
          textAlign: "center",
          fontWeight: 700,
          fontSize: {
            xs: config.fontSize.mobile,
            sm: config.fontSize.desktop,
          },
          color: theme.palette.primary.main,
          userSelect: "none",
        }}
      >
        {value}
      </Typography>

      <IconButton
        type="button"
        onClick={handleIncrement}
        disabled={disabled || isAtMax}
        aria-label={`Увеличить количество ${accessibleItemName}`}
        size="small"
        sx={{
          width: {
            xs: config.buttonWidth.mobile,
            sm: config.buttonWidth.desktop,
          },
          minWidth: 44,
          minHeight: 44,
          height: "100%",
          borderRadius: 0,
          color: theme.palette.primary.main,
          opacity: isAtMax ? 0.5 : 1,
          transition: "background-color 0.15s ease",
          "&:hover": {
            bgcolor: alpha(theme.palette.primary.main, 0.15),
          },
          "&:active": {
            bgcolor: alpha(theme.palette.primary.main, 0.25),
          },
          "&.Mui-disabled": {
            color: theme.palette.action.disabled,
          },
        }}
      >
        <Add
          sx={{
            fontSize: {
              xs: config.iconSize.mobile,
              sm: config.iconSize.desktop,
            },
            color: "inherit",
          }}
        />
      </IconButton>
    </Box>
  );
};
