import React from "react";
import {
  IconButton,
  CircularProgress,
  useTheme,
  alpha,
  useMediaQuery,
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
  variant?: "default" | "fab" | "detailed" | "bar" | "overlay";
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  productId,
  isFavorite,
  className,
  productName,
  variant = "default",
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { isAuthenticated } = useAuth();
  const { toggleFavorite, isLoading } = useToggleFavorite(isAuthenticated);
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
      size={
        variant === "fab"
          ? 24
          : variant === "bar" || variant === "overlay"
            ? 20
            : isMobile
              ? 16
              : 20
      }
      thickness={4}
      sx={{
        color:
          variant === "fab"
            ? "white"
            : variant === "bar" || variant === "overlay"
              ? isFavorite
                ? "error.main"
                : "text.secondary"
              : theme.palette.text.secondary,
      }}
    />
  ) : isFavorite ? (
    <FavoriteIcon
      sx={{
        color: variant === "fab" ? "white" : theme.palette.error.main,
        fontSize:
          variant === "fab"
            ? "1.5rem"
            : variant === "bar" || variant === "overlay"
              ? "1.25rem"
              : isMobile
                ? "1rem"
                : "1.25rem",
      }}
    />
  ) : (
    <FavoriteBorderIcon
      sx={{
        color:
          variant === "fab"
            ? "white"
            : variant === "bar" || variant === "overlay"
              ? theme.palette.text.secondary
              : theme.palette.text.secondary,
        fontSize:
          variant === "fab"
            ? "1.5rem"
            : variant === "bar" || variant === "overlay"
              ? "1.25rem"
              : isMobile
                ? "1rem"
                : "1.25rem",
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
            top: isMobile ? 4 : 10,
            right: isMobile ? 4 : 10,
            zIndex: 2,
            bgcolor: alpha(theme.palette.background.paper, 0.7),
            backdropFilter: "blur(4px)",
            width: isMobile ? 28 : 36,
            height: isMobile ? 28 : 36,
            padding: isMobile ? "4px" : "8px",
            "&:hover": {
              bgcolor: alpha(theme.palette.background.paper, 0.9),
            },
            "&:disabled": {
              bgcolor: alpha(theme.palette.background.paper, 0.5),
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
