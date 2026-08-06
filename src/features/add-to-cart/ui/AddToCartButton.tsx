import React, { useEffect } from "react";
import {
  Box,
  Button,
  Stack,
  Tooltip,
  useTheme,
} from "@mui/material";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useRouter } from "next/navigation";
import { useCartItemRemoval, useCartQuantity } from "@/entities/cart";
import { useAuth } from "@/entities/session";
import { useAuthRequired } from "@/shared/hooks";
import { AuthRequiredDialog } from "@/shared/ui/auth-required-dialog";
import { CartCounter } from "@/shared/ui/cart-counter";
import { useNotification } from "@/shared/ui/notification";
import { Availability } from "@/entities/product";
import { useAddToCartFeature } from "../model/useAddToCartFeature";

interface AddToCartButtonProps {
  productId: number;
  sellerId: number;
  availability: Availability;
  variant?: "default" | "detailed";
  size?: "small" | "medium" | "large";
  fullWidth?: boolean;
  productName?: string;
  stockCount?: number | null;
}

export const AddToCartButton: React.FC<AddToCartButtonProps> = ({
  productId,
  sellerId,
  variant = "default",
  size = "medium",
  fullWidth = true,
  availability,
  productName,
  stockCount,
}) => {
  const theme = useTheme();
  const router = useRouter();
  const {
    isOpen,
    productName: dialogProductName,
    showDialog,
    hideDialog,
  } = useAuthRequired();
  const { isAuthenticated } = useAuth();
  const { showNotification } = useNotification();
  const handleQuantitySyncError = React.useCallback(() => {
    showNotification(
      "Не удалось сохранить количество. Восстановлено предыдущее значение",
      "error",
    );
  }, [showNotification]);

  const {
    handleAddToCart,
    isPending,
    isOwnProduct,
    isOwnerCheckPending,
    isOwnerCheckError,
  } = useAddToCartFeature(isAuthenticated, sellerId, {
    onAuthRequired: (name) => showDialog(name),
    onNotification: (message, severity) =>
      showNotification(message, severity),
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
  } = useCartQuantity(productId, isAuthenticated, {
    maxQuantity: stockCount,
    onSyncError: handleQuantitySyncError,
  });

  const isPreorder = availability === "PREORDER";
  const isRemoving = removingItemIds.includes(productId);
  const isOutOfStock =
    stockCount !== null && stockCount !== undefined && stockCount <= 0;

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
      handleRemoveItem(productId);
      handleSetQuantity(0);
    } else {
      handleDecrement();
    }
  };

  const handleIncrementClick = () => {
    if (!canIncrement) {
      showNotification(`Максимальное количество: ${maxQuantity} шт.`, "warning");
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
      py: { xs: 0.75, sm: 1 },
      fontSize: { xs: "0.75rem", sm: "0.875rem" },
      borderRadius: { xs: 1, sm: 1.5 },
    };
  };

  const getColorStyles = () => {
    if (isOwnProduct || isOutOfStock || isOwnerCheckError) {
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
    }

    return {
      "&:hover": {
        bgcolor: theme.palette.primary.dark,
      },
    };
  };

  const getButtonText = () => {
    if (isOwnProduct) {
      return "Ваш товар";
    }
    if (isOwnerCheckError) {
      return "Недоступно";
    }
    if (isOutOfStock) {
      return "Нет в наличии";
    }
    if (isPreorder) {
      return "Предзаказ";
    }
    return variant === "detailed" ? "Добавить в корзину" : "Купить";
  };

  if (
    inCart &&
    !isOutOfStock &&
    !isOwnProduct &&
    !isOwnerCheckPending &&
    !isOwnerCheckError
  ) {
    if (variant === "detailed") {
      const detailedContent = (
        <Stack
          direction="row"
          spacing={{ xs: 1, sm: 2 }}
          alignItems="center"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          sx={{ width: fullWidth ? "100%" : "auto" }}
        >
          <Box sx={{ flexShrink: 0, minWidth: { xs: 132, sm: 156 } }}>
            <CartCounter
              value={quantity}
              onIncrement={handleIncrementClick}
              onDecrement={handleDecrementWithRemove}
              disabled={isPending || isRemoving}
              isAtMax={isAtMaxQuantity}
              size="large"
              itemName={productName}
            />
          </Box>

          <Button
            variant="contained"
            onClick={() => router.push("/checkout")}
            endIcon={<ChevronRightIcon />}
            fullWidth
            sx={{
              minWidth: 0,
              borderRadius: 3,
              fontSize: { xs: "14px", sm: "16px" },
              fontWeight: 600,
              height: { xs: 44, sm: 48 },
              px: { xs: 1.5, sm: 2 },
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              overflow: "hidden",
              "& .MuiButton-endIcon": {
                display: { xs: "none", sm: "inherit" },
              },
              "&:hover": {
                bgcolor: "primary.dark",
              },
            }}
          >
            <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
              Оформить
            </Box>
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
              В корзине
            </Box>
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
          itemName={productName}
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
        disabled={
          isPending ||
          isOutOfStock ||
          isOwnProduct ||
          isOwnerCheckPending ||
          isOwnerCheckError
        }
        size={size}
        startIcon={
          variant === "default" &&
          !isOutOfStock &&
          !isOwnProduct &&
          !isOwnerCheckError ? (
            <ShoppingCartOutlinedIcon
              sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
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
