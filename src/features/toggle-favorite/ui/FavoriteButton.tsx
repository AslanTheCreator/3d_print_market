import React from "react";
import {
  Box,
  IconButton,
  CircularProgress,
  useTheme,
  alpha,
  Fab,
  Button,
} from "@mui/material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { useAuth } from "@/entities/session";
import { useAuthRequired } from "@/shared/hooks";
import { AuthRequiredDialog } from "@/shared/ui/auth-required-dialog";
import { useToggleFavorite } from "../model/useToggleFavorite";

interface FavoriteButtonProps {
  productId: number;
  isFavorite: boolean;
  className?: string;
  productName?: string;
  variant?:
    | "default"
    | "fab"
    | "detailed"
    | "bar"
    | "overlay"
    | "product-details";
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  productId,
  isFavorite,
  className,
  productName,
  variant = "default",
}) => {
  const theme = useTheme();
  const { isAuthenticated } = useAuth();
  const { toggleFavorite, isLoading } = useToggleFavorite(isAuthenticated);
  const isCardVariant = variant === "default";
  const cardIconFilter = isCardVariant
    ? "drop-shadow(0 1px 1px rgba(0, 0, 0, 0.9)) drop-shadow(0 0 1px rgba(0, 0, 0, 0.75))"
    : "none";
  const iconFontSize =
    variant === "fab"
      ? "1.5rem"
      : isCardVariant
        ? "1.75rem"
        : variant === "bar" || variant === "overlay"
          ? "1.25rem"
          : { xs: "1rem", sm: "1.25rem" };
  const {
    isOpen,
    productName: dialogProductName,
    showDialog,
    hideDialog,
  } = useAuthRequired();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      showDialog(productName);
      return;
    }

    toggleFavorite(productId);
  };

  const icon = isLoading ? (
    <CircularProgress
      size={variant === "fab" ? 24 : isCardVariant ? 28 : 20}
      thickness={4}
      sx={{
        color:
          variant === "fab" || isCardVariant
            ? "common.white"
            : variant === "bar" || variant === "overlay"
              ? isFavorite
                ? "error.main"
                : "text.secondary"
              : theme.palette.text.secondary,
        filter: cardIconFilter,
      }}
    />
  ) : isFavorite ? (
    <FavoriteIcon
      sx={{
        color:
          variant === "fab" ? "common.white" : theme.palette.error.main,
        fontSize: iconFontSize,
        filter: cardIconFilter,
        stroke: isCardVariant
          ? alpha(theme.palette.common.black, 0.8)
          : "none",
        strokeWidth: isCardVariant ? 1.25 : 0,
        paintOrder: isCardVariant ? "stroke fill" : "normal",
      }}
    />
  ) : isCardVariant ? (
    <FavoriteIcon
      sx={{
        color: "common.white",
        fontSize: iconFontSize,
        filter: cardIconFilter,
        stroke: alpha(theme.palette.common.black, 0.8),
        strokeWidth: 1.25,
        paintOrder: "stroke fill",
      }}
    />
  ) : (
    <FavoriteBorderIcon
      sx={{
        color:
          variant === "fab" ? "common.white" : theme.palette.text.secondary,
        fontSize: iconFontSize,
        filter: cardIconFilter,
      }}
    />
  );

  return (
    <>
      {variant === "fab" ? (
        <Fab
          className={className}
          color="primary"
          sx={{
            position: "fixed",
            bottom: 80,
            right: 16,
            zIndex: 1001,
            boxShadow: "0 4px 16px rgba(247, 110, 160, 0.3)",
          }}
          onClick={handleClick}
          disabled={isLoading}
          aria-label={
            isFavorite ? "Удалить из избранного" : "Добавить в избранное"
          }
        >
          {icon}
        </Fab>
      ) : variant === "detailed" ? (
        <Button
          className={className}
          variant={isFavorite ? "contained" : "outlined"}
          color={isFavorite ? "error" : "inherit"}
          fullWidth
          startIcon={
            isLoading ? (
              <CircularProgress size={20} thickness={4} color="inherit" />
            ) : isFavorite ? (
              <FavoriteIcon />
            ) : (
              <FavoriteBorderIcon />
            )
          }
          onClick={handleClick}
          disabled={isLoading}
          sx={{
            borderRadius: "12px",
            py: 1.5,
            fontWeight: 600,
            fontSize: "16px",
            textTransform: "none",
            ...(isFavorite
              ? {}
              : {
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                  borderColor: "primary.main",
                  color: "primary.main",
                  "&:hover": {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.15),
                    borderColor: "primary.main",
                  },
                }),
          }}
        >
          {isFavorite ? "В избранном" : "В избранное"}
        </Button>
      ) : variant === "product-details" ? (
        <Button
          className={className}
          variant="outlined"
          fullWidth
          startIcon={
            isLoading ? (
              <CircularProgress size={20} thickness={4} color="inherit" />
            ) : isFavorite ? (
              <FavoriteIcon />
            ) : (
              <FavoriteBorderIcon />
            )
          }
          onClick={handleClick}
          disabled={isLoading}
          aria-label={
            isFavorite ? "Удалить из избранного" : "Добавить в избранное"
          }
          sx={(theme) => ({
            width: { xs: 44, sm: "100%" },
            minWidth: { xs: 44, sm: 64 },
            height: { xs: 44, sm: "auto" },
            p: { xs: 0, sm: 1.5 },
            borderRadius: { xs: 2.5, sm: "12px" },
            fontWeight: 600,
            fontSize: "16px",
            textTransform: "none",
            color: {
              xs: isFavorite ? "error.main" : "text.secondary",
              sm: isFavorite ? "common.white" : "primary.main",
            },
            borderColor: isFavorite ? "error.light" : "primary.main",
            bgcolor: {
              xs: alpha(theme.palette.background.paper, 0.92),
              sm: isFavorite
                ? theme.palette.error.main
                : alpha(theme.palette.primary.main, 0.08),
            },
            backdropFilter: { xs: "blur(10px)", sm: "none" },
            boxShadow: {
              xs: "0 8px 24px rgba(15, 23, 42, 0.12)",
              sm: "none",
            },
            "& .MuiButton-startIcon": {
              m: { xs: 0, sm: "0 8px 0 -4px" },
              color: "inherit",
            },
            "&:hover": {
              borderColor: isFavorite ? "error.main" : "primary.main",
              bgcolor: {
                xs: alpha(theme.palette.background.paper, 0.98),
                sm: isFavorite
                  ? theme.palette.error.dark
                  : alpha(theme.palette.primary.main, 0.15),
              },
            },
          })}
        >
          <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
            {isFavorite ? "В избранном" : "В избранное"}
          </Box>
        </Button>
      ) : variant === "bar" ? (
        <IconButton
          className={className}
          onClick={handleClick}
          disabled={isLoading}
          aria-label={
            isFavorite ? "Удалить из избранного" : "Добавить в избранное"
          }
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2.5,
            border: "1px solid",
            borderColor: isFavorite ? "error.main" : "divider",
            bgcolor: isFavorite
              ? (theme) => alpha(theme.palette.error.main, 0.08)
              : (theme) => theme.palette.background.paper,
            color: isFavorite ? "error.main" : "text.secondary",
            flexShrink: 0,
          }}
        >
          {icon}
        </IconButton>
      ) : variant === "overlay" ? (
        <IconButton
          className={className}
          onClick={handleClick}
          disabled={isLoading}
          aria-label={
            isFavorite ? "Удалить из избранного" : "Добавить в избранное"
          }
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2.5,
            bgcolor: (theme) => alpha(theme.palette.background.paper, 0.92),
            backdropFilter: "blur(10px)",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
            border: "1px solid",
            borderColor: isFavorite
              ? "error.light"
              : (theme) => alpha(theme.palette.common.black, 0.08),
            color: isFavorite ? "error.main" : "text.primary",
            "&:hover": {
              bgcolor: (theme) => alpha(theme.palette.background.paper, 0.98),
            },
          }}
        >
          {icon}
        </IconButton>
      ) : (
        <IconButton
          className={className}
          sx={{
            position: "absolute",
            top: { xs: 4, sm: 10 },
            right: { xs: 4, sm: 10 },
            zIndex: 2,
            bgcolor: "transparent",
            backdropFilter: "none",
            boxShadow: "none",
            width: 44,
            height: 44,
            padding: { xs: "8px", sm: "10px" },
            "&:hover": {
              bgcolor: "transparent",
              "& .MuiSvgIcon-root": {
                transform: "scale(1.08)",
              },
            },
            "&:disabled": {
              bgcolor: "transparent",
            },
            "&.Mui-focusVisible": {
              outline: `2px solid ${theme.palette.common.white}`,
              outlineOffset: 2,
              boxShadow: `0 0 0 4px ${alpha(theme.palette.common.black, 0.72)}`,
            },
            "& .MuiSvgIcon-root": {
              transition: theme.transitions.create("transform", {
                duration: theme.transitions.duration.shortest,
              }),
            },
          }}
          onClick={handleClick}
          disabled={isLoading}
          aria-label={
            isFavorite ? "Удалить из избранного" : "Добавить в избранное"
          }
        >
          {icon}
        </IconButton>
      )}

      <AuthRequiredDialog
        open={isOpen}
        onClose={hideDialog}
        productName={dialogProductName}
      />
    </>
  );
};
