import React from "react";
import { Box, Typography, Button, Stack } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { ShoppingBag, AlertCircle, RefreshCw } from "lucide-react";

interface EmptyStateProps {
  type: "empty" | "error";
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyCatalogState: React.FC<EmptyStateProps> = ({
  type,
  title,
  description,
  actionLabel,
  onAction,
  icon,
}) => {
  const theme = useTheme();

  const getDefaultIcon = () => {
    switch (type) {
      case "empty":
        return <ShoppingBag size={48} color={theme.palette.text.secondary} />;
      case "error":
        return <AlertCircle size={48} color={theme.palette.error.main} />;
      default:
        return null;
    }
  };

  const getDefaultColors = () => {
    switch (type) {
      case "error":
        return {
          iconColor: theme.palette.error.main,
          titleColor: theme.palette.error.main,
        };
      default:
        return {
          iconColor: theme.palette.text.secondary,
          titleColor: theme.palette.text.primary,
        };
    }
  };

  const colors = getDefaultColors();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: { xs: 6, sm: 8 },
        px: { xs: 2, sm: 4 },
        textAlign: "center",
        minHeight: "40vh",
      }}
    >
      <Stack spacing={3} alignItems="center" maxWidth="400px">
        {/* Иконка */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: { xs: 64, sm: 80 },
            height: { xs: 64, sm: 80 },
            borderRadius: "50%",
            backgroundColor:
              type === "error"
                ? theme.palette.error.light + "20"
                : theme.palette.grey[100],
            mb: 1,
          }}
        >
          {icon || getDefaultIcon()}
        </Box>

        {/* Заголовок */}
        <Typography
          variant="h4"
          component="h3"
          sx={{
            color: colors.titleColor,
            fontWeight: 600,
            fontSize: { xs: "1.25rem", sm: "1.5rem" },
            lineHeight: 1.3,
          }}
        >
          {title}
        </Typography>

        {/* Описание */}
        {description && (
          <Typography
            variant="body1"
            sx={{
              color: theme.palette.text.secondary,
              fontSize: { xs: "0.875rem", sm: "1rem" },
              lineHeight: 1.5,
              maxWidth: "300px",
            }}
          >
            {description}
          </Typography>
        )}

        {/* Кнопка действия */}
        {onAction && actionLabel && (
          <Button
            variant={type === "error" ? "contained" : "outlined"}
            color={type === "error" ? "error" : "primary"}
            onClick={onAction}
            sx={{
              mt: 2,
              px: { xs: 3, sm: 4 },
              py: { xs: 1, sm: 1.5 },
              borderRadius: "8px",
              textTransform: "none",
              fontWeight: 600,
            }}
            startIcon={type === "error" ? <RefreshCw size={18} /> : undefined}
          >
            {actionLabel}
          </Button>
        )}
      </Stack>
    </Box>
  );
};
