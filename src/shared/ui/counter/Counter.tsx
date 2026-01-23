import React from "react";
import { Box, IconButton, Typography, alpha } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";

interface CounterProps {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  min?: number;
  max?: number;
  size?: "small" | "medium" | "large";
  disabled?: boolean;
}

export const Counter: React.FC<CounterProps> = ({
  value,
  onIncrement,
  onDecrement,
  min = 1,
  max = 99,
  size = "medium",
  disabled = false,
}) => {
  const isMinReached = value <= min;
  const isMaxReached = value >= max;

  const getSizeStyles = () => {
    switch (size) {
      case "small":
        return {
          buttonSize: "small" as const,
          iconSize: "small" as const,
          fontSize: "0.875rem",
          minWidth: "28px",
          height: "28px",
        };
      case "large":
        return {
          buttonSize: "medium" as const,
          iconSize: "medium" as const,
          fontSize: "1.125rem",
          minWidth: "40px",
          height: "40px",
        };
      default:
        return {
          buttonSize: "small" as const,
          iconSize: "small" as const,
          fontSize: "1rem",
          minWidth: "32px",
          height: "32px",
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
        borderRadius: 2,
        padding: "4px",
        border: "1px solid",
        borderColor: (theme) => alpha(theme.palette.primary.main, 0.2),
      }}
    >
      <IconButton
        size={sizeStyles.buttonSize}
        onClick={onDecrement}
        disabled={disabled || isMinReached}
        sx={{
          minWidth: sizeStyles.minWidth,
          height: sizeStyles.height,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          "&:hover": {
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
          },
          "&.Mui-disabled": {
            bgcolor: "action.disabledBackground",
            borderColor: "action.disabledBackground",
          },
        }}
        aria-label="Уменьшить количество"
      >
        <RemoveIcon fontSize={sizeStyles.iconSize} />
      </IconButton>

      <Typography
        component="span"
        sx={{
          minWidth: "32px",
          textAlign: "center",
          fontWeight: 600,
          fontSize: sizeStyles.fontSize,
          userSelect: "none",
          color: disabled ? "text.disabled" : "text.primary",
        }}
      >
        {value}
      </Typography>

      <IconButton
        size={sizeStyles.buttonSize}
        onClick={onIncrement}
        disabled={disabled || isMaxReached}
        sx={{
          minWidth: sizeStyles.minWidth,
          height: sizeStyles.height,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          "&:hover": {
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
          },
          "&.Mui-disabled": {
            bgcolor: "action.disabledBackground",
            borderColor: "action.disabledBackground",
          },
        }}
        aria-label="Увеличить количество"
      >
        <AddIcon fontSize={sizeStyles.iconSize} />
      </IconButton>
    </Box>
  );
};
