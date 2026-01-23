import React, { useEffect } from "react";
import { Button, useMediaQuery, useTheme, Box, Tooltip } from "@mui/material";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import { Availability } from "@/entities/product/model/types";
import { useAuthRequired } from "@/shared/hooks";
import { AuthRequiredDialog } from "@/shared/ui/auth-required-dialog";
import { CartCounter } from "@/shared/ui/cart-counter";
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
  stockCount?: number | null; // null означает неограниченное количество
}

export const AddToCartButton: React.FC<AddToCartButtonProps> = ({
  productId,
  variant = "default",
  size = "medium",
  fullWidth = true,
  availability,
  productName,
  stockCount,
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
    maxQuantity,
    canIncrement,
    isAtMaxQuantity,
    handleIncrement,
    handleDecrement,
    handleSetQuantity,
    adjustQuantityToMax,
  } = useCartQuantity(productId, { maxQuantity: stockCount });

  const isPreorder = availability === "PREORDER";
  const isRemoving = removingItemIds.includes(productId);
  const isOutOfStock =
    stockCount !== null && stockCount !== undefined && stockCount <= 0;

  // Автоматически корректируем количество при изменении stockCount
  useEffect(() => {
    if (inCart) {
      adjustQuantityToMax();
    }
  }, [stockCount, inCart, adjustQuantityToMax]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock) {
      showNotification("Товар закончился", "warning");
      return;
    }

    handleAddToCart(productId, productName);
  };

  const handleDecrementWithRemove = () => {
    if (quantity <= 1) {
      // Удаляем товар из корзины при нажатии минус когда quantity = 1
      handleRemoveItem(productId);
      handleSetQuantity(0);
    } else {
      handleDecrement();
    }
  };

  const handleIncrementClick = () => {
    if (!canIncrement) {
      showNotification(
        `Максимальное количество: ${maxQuantity} шт.`,
        "warning",
      );
      return;
    }
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
    if (isOutOfStock) {
      return {
        bgcolor: theme.palette.grey[400],
        color: theme.palette.grey[600],
        "&:hover": {
          bgcolor: theme.palette.grey[400],
        },
      };
    }

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
    if (isOutOfStock) {
      return "Нет в наличии";
    }
    if (isPreorder) {
      return "Предзаказ";
    }
    return variant === "detailed" ? "В корзину" : "Купить";
  };

  // Показываем CartCounter если товар в корзине (только для варианта default в каталоге)
  if (inCart && !isOutOfStock && variant === "default") {
    const counterContent = (
      <Box
        sx={{
          width: fullWidth ? "100%" : "auto",
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <CartCounter
          value={quantity}
          onIncrement={handleIncrementClick}
          onDecrement={handleDecrementWithRemove}
          disabled={isPending || isRemoving}
          isAtMax={isAtMaxQuantity}
        />
      </Box>
    );

    // Показываем tooltip если достигнут лимит
    if (isAtMaxQuantity && maxQuantity !== null && maxQuantity !== undefined) {
      return (
        <Tooltip title={`Максимум ${maxQuantity} шт.`} arrow placement="top">
          {counterContent}
        </Tooltip>
      );
    }

    return counterContent;
  }

  return (
    <>
      <Button
        onClick={handleClick}
        variant="contained"
        fullWidth={fullWidth}
        disabled={isPending || isOutOfStock}
        size={size}
        startIcon={
          variant === "default" && !isOutOfStock ? (
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
