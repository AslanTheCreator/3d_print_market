import { Box, IconButton, Typography, useTheme, alpha } from "@mui/material";
import { Add, Remove } from "@mui/icons-material";

interface QuantityCounterProps {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  size?: "small" | "medium" | "responsive";
  itemName?: string;
}

export const QuantityCounter = ({
  value,
  onIncrement,
  onDecrement,
  disabled = false,
  min = 1,
  max,
  size = "medium",
  itemName,
}: QuantityCounterProps) => {
  const theme = useTheme();

  const isMinReached = value <= min;
  const isMaxReached = max !== undefined && value >= max;
  const accessibleItemName = itemName?.trim() || "товара";
  const counterLabel = itemName?.trim()
    ? `Количество товара «${accessibleItemName}»`
    : "Количество товара";

  const iconSize =
    size === "responsive" ? { xs: 16, sm: 20 } : size === "small" ? 16 : 20;
  const gap =
    size === "responsive" ? { xs: 1, sm: 1.5 } : size === "small" ? 1 : 1.5;
  const valueMinWidth =
    size === "responsive" ? { xs: 24, sm: 32 } : size === "small" ? 24 : 32;
  const valueFontSize =
    size === "responsive"
      ? { xs: "0.875rem", sm: "1rem" }
      : size === "small"
        ? "0.875rem"
        : "1rem";

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap,
      }}
      role="group"
      aria-label={counterLabel}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <IconButton
        onClick={onDecrement}
        disabled={disabled || isMinReached}
        aria-label={`Уменьшить количество ${accessibleItemName}`}
        size="small"
        sx={{
          width: 44,
          height: 44,
          minWidth: 44,
          minHeight: 44,
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
          minWidth: valueMinWidth,
          textAlign: "center",
          fontWeight: 600,
          fontSize: valueFontSize,
          color: theme.palette.text.primary,
          userSelect: "none",
        }}
      >
        {value}
      </Typography>

      <IconButton
        onClick={onIncrement}
        disabled={disabled || isMaxReached}
        aria-label={`Увеличить количество ${accessibleItemName}`}
        size="small"
        sx={{
          width: 44,
          height: 44,
          minWidth: 44,
          minHeight: 44,
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
