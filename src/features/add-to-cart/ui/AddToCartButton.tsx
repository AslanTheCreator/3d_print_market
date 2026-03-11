import React, { useEffect } from "react";
import {
  Button,
  useMediaQuery,
  useTheme,
  Box,
  Tooltip,
  Stack,
} from "@mui/material";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useRouter } from "next/navigation";
import {
  useCartItemRemoval,
  useCartQuantity,
} from "@/entities/cart";
import { useAuth } from "@/shared/lib/auth";
import { useAuthRequired } from "@/shared/hooks";
import { AuthRequiredDialog } from "@/shared/ui/auth-required-dialog";
import { CartCounter } from "@/shared/ui/cart-counter";
import { useAddToCartFeature } from "../model/useAddToCartFeature";
import { useNotification } from "@/shared/ui/notification";
import { Availability } from "@/shared/types";

interface AddToCartButtonProps {
  productId: number;
  availability: Availability;
  variant?: "default" | "detailed";
  size?: "small" | "medium" | "large";
  fullWidth?: boolean;
  productName?: string;
  stockCount?: number | null; // Количество товара в наличии (null = неограниченно)
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
  const router = useRouter();
  const {
    isOpen,
    productName: dialogProductName,
    showDialog,
    hideDialog,
  } = useAuthRequired();
  const { isAuthenticated } = useAuth();
  const { showNotification } = useNotification();

  const { handleAddToCart, isPending } = useAddToCartFeature(isAuthenticated, {
    onAuthRequired: (name) => showDialog(name),
    onNotification: (message, severity) => showNotification(message, severity),
    onSuccess: () => {
      handleSetQuantity(1);
    },
  });

  const { handleRemoveItem, removingItemIds } = useCartItemRemoval();

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
  } = useCartQuantity(productId, isAuthenticated, { maxQuantity: stockCount });

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
    return variant === "detailed" ? "Добавить в корзину" : "Купить";
  };

  // Показываем CartCounter если товар в корзине
  if (inCart && !isOutOfStock) {
    // Вариант detailed — счётчик + кнопка «В корзине»
    if (variant === "detailed") {
      const detailedContent = (
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          sx={{ width: fullWidth ? "100%" : "auto" }}
        >
          <CartCounter
            value={quantity}
            onIncrement={handleIncrementClick}
            onDecrement={handleDecrementWithRemove}
            disabled={isPending || isRemoving}
            isAtMax={isAtMaxQuantity}
            size="large"
          />

          <Button
            variant="contained"
            onClick={() => router.push("/checkout")}
            endIcon={<ChevronRightIcon />}
            fullWidth
            sx={{
              borderRadius: 3,
              fontSize: "16px",
              fontWeight: 600,
              height: 48,
              "&:hover": {
                bgcolor: "primary.dark",
              },
            }}
          >
            В корзине
          </Button>
        </Stack>
      );

      if (
        isAtMaxQuantity &&
        maxQuantity !== null &&
        maxQuantity !== undefined
      ) {
        return (
          <Tooltip title={`Максимум ${maxQuantity} шт.`} arrow placement="top">
            {detailedContent}
          </Tooltip>
        );
      }

      return detailedContent;
    }

    // Вариант default — компактный CartCounter
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
