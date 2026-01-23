import React from "react";
import { Button, useMediaQuery, useTheme, Box } from "@mui/material";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import { Availability } from "@/entities/product/model/types";
import { useAuthRequired } from "@/shared/hooks";
import { AuthRequiredDialog } from "@/shared/ui/auth-required-dialog";
import { Counter } from "@/shared/ui/counter";
import { useAddToCartFeature } from "../model/useAddToCartFeature";
import { useNotification } from "@/app/providers";
import { useCartQuantity } from "@/entities/cart/hooks/useCartQuantity";
import { useRemoveFromCartFeature } from "@/features/cart/remove-from-cart/model/useRemoveFromCartFeature";

interface AddToCartButtonProps {
  productId: number;
  availability: Availability;
  variant?: "default" | "detailed";
  size?: "small" | "medium" | "large";
  fullWidth?: boolean;
  productName?: string;
}

export const AddToCartButton: React.FC<AddToCartButtonProps> = ({
  productId,
  variant = "default",
  size = "medium",
  fullWidth = true,
  availability,
  productName,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const {
    isOpen,
    productName: dialogProductName,
    showDialog,
    hideDialog,
  } = useAuthRequired();
  const { showNotification } = useNotification();

  const { handleAddToCart, isPending } = useAddToCartFeature({
    onAuthRequired: (name) => showDialog(name),
    onNotification: (message, severity) => showNotification(message, severity),
    onSuccess: () => {
      handleSetQuantity(1);
    },
  });

  const { handleRemoveItem, removingItemIds } = useRemoveFromCartFeature();

  const {
    inCart,
    quantity,
    handleIncrement,
    handleDecrement,
    handleSetQuantity,
  } = useCartQuantity(productId);

  const isPreorder = availability === "PREORDER";
  const isRemoving = removingItemIds.includes(productId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleAddToCart(productId, productName);
  };

  const handleDecrementWithRemove = () => {
    if (quantity <= 1) {
      handleRemoveItem(productId);
      handleSetQuantity(0);
    } else {
      handleDecrement();
    }
  };

  const handleIncrementClick = () => {
    handleIncrement();
  };

  const getButtonStyles = () => {
    const baseStyles = {
      fontWeight: 600,
      transition: "all 0.2s ease-in-out",
    };

    if (variant === "detailed") {
      return {
        ...baseStyles,
        borderRadius: "12px",
        fontSize: "16px",
        py: 1.5,
      };
    }

    return {
      ...baseStyles,
      py: isMobile ? 0.75 : 1,
      fontSize: isMobile ? "0.75rem" : "0.875rem",
      borderRadius: isMobile ? 1 : 1.5,
    };
  };

  const getColorStyles = () => {
    if (isPreorder) {
      return {
        bgcolor: theme.palette.preorder.main,
        color: theme.palette.preorder.contrastText,
        "&:hover": {
          bgcolor: theme.palette.preorder.dark,
        },
      };
    } else {
      return {
        "&:hover": {
          bgcolor: theme.palette.primary.dark,
        },
      };
    }
  };

  const getButtonText = () => {
    if (isPreorder) {
      return "Предзаказ";
    }
    return variant === "detailed" ? "В корзину" : "Купить";
  };

  if (inCart) {
    return (
      <Box
        sx={{
          width: fullWidth ? "100%" : "auto",
          display: "flex",
          justifyContent: "center",
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <Counter
          value={quantity}
          onIncrement={handleIncrementClick}
          onDecrement={handleDecrementWithRemove}
          min={1}
          max={99}
          size={isMobile ? "small" : "medium"}
          disabled={isPending || isRemoving}
        />
      </Box>
    );
  }

  return (
    <>
      <Button
        onClick={handleClick}
        variant="contained"
        fullWidth={fullWidth}
        disabled={isPending}
        size={size}
        startIcon={
          variant === "default" ? (
            <ShoppingCartOutlinedIcon
              sx={{ fontSize: isMobile ? "0.875rem" : "1rem" }}
            />
          ) : undefined
        }
        sx={{
          ...getButtonStyles(),
          ...getColorStyles(),
        }}
      >
        {getButtonText()}
      </Button>

      <AuthRequiredDialog
        open={isOpen}
        onClose={hideDialog}
        productName={dialogProductName}
      />
    </>
  );
};
