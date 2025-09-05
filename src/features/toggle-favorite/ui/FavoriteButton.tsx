import React from "react";
import {
  IconButton,
  CircularProgress,
  useTheme,
  alpha,
  useMediaQuery,
} from "@mui/material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { useToggleFavorite } from "@/entities/favorites/hooks";
import { useAuth } from "@/features/auth";
import { useAuthRequired } from "@/shared/hooks";
import { AuthRequiredDialog } from "@/shared/ui";

interface FavoriteButtonProps {
  productId: number;
  isFavorite: boolean;
  className?: string;
  productName?: string;
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  productId,
  isFavorite,
  className,
  productName,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { toggleFavorite, isLoading } = useToggleFavorite();
  const { isAuthenticated } = useAuth();
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

  return (
    <>
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
        {isLoading ? (
          <CircularProgress
            size={isMobile ? 16 : 20}
            thickness={4}
            sx={{ color: theme.palette.text.secondary }}
          />
        ) : isFavorite ? (
          <FavoriteIcon
            sx={{
              color: theme.palette.error.main,
              fontSize: isMobile ? "1rem" : "1.25rem",
            }}
          />
        ) : (
          <FavoriteBorderIcon
            sx={{
              color: theme.palette.text.secondary,
              fontSize: isMobile ? "1rem" : "1.25rem",
            }}
          />
        )}
      </IconButton>

      <AuthRequiredDialog
        open={isOpen}
        onClose={hideDialog}
        productName={dialogProductName}
      />
    </>
  );
};
