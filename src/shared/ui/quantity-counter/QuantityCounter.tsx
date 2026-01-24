import { Box, IconButton, Typography, useTheme, alpha } from "@mui/material";
import { Add, Remove } from "@mui/icons-material";

interface QuantityCounterProps {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  size?: "small" | "medium";
}

export const QuantityCounter = ({
  value,
  onIncrement,
  onDecrement,
  disabled = false,
  min = 1,
  max,
  size = "medium",
}: QuantityCounterProps) => {
  const theme = useTheme();

  const isMinReached = value <= min;
  const isMaxReached = max !== undefined && value >= max;

  const buttonSize = size === "small" ? 28 : 36;
  const iconSize = size === "small" ? 16 : 20;

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: size === "small" ? 1 : 1.5,
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <IconButton
        onClick={onDecrement}
        disabled={disabled || isMinReached}
        size="small"
        sx={{
          width: buttonSize,
          height: buttonSize,
          backgroundColor: alpha(theme.palette.primary.main, 0.1),
          color: theme.palette.primary.main,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            backgroundColor: alpha(theme.palette.primary.main, 0.2),
          },
          "&:disabled": {
            backgroundColor: alpha(theme.palette.grey[400], 0.1),
            color: theme.palette.grey[400],
            borderColor: alpha(theme.palette.grey[400], 0.3),
          },
        }}
      >
        <Remove sx={{ fontSize: iconSize }} />
      </IconButton>

      <Typography
        sx={{
          minWidth: size === "small" ? 24 : 32,
          textAlign: "center",
          fontWeight: 600,
          fontSize: size === "small" ? "0.875rem" : "1rem",
          color: theme.palette.text.primary,
          userSelect: "none",
        }}
      >
        {value}
      </Typography>

      <IconButton
        onClick={onIncrement}
        disabled={disabled || isMaxReached}
        size="small"
        sx={{
          width: buttonSize,
          height: buttonSize,
          backgroundColor: alpha(theme.palette.primary.main, 0.1),
          color: theme.palette.primary.main,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            backgroundColor: alpha(theme.palette.primary.main, 0.2),
          },
          "&:disabled": {
            backgroundColor: alpha(theme.palette.grey[400], 0.1),
            color: theme.palette.grey[400],
            borderColor: alpha(theme.palette.grey[400], 0.3),
          },
        }}
      >
        <Add sx={{ fontSize: iconSize }} />
      </IconButton>
    </Box>
  );
};
