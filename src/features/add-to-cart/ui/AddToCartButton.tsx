import React from "react";
import { alpha, Button, useMediaQuery, useTheme } from "@mui/material";
import { useRouter } from "next/navigation";
import { useAddToCart, useCartChecks, useCartProducts } from "@/entities/cart";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import { useAuth } from "@/features/auth";
import { Availability } from "@/entities/product/model/types";
import { useAuthRequired } from "@/shared/hooks";
import { AuthRequiredDialog } from "@/shared/ui";

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
  const router = useRouter();
  const { mutate: addToCart, isPending } = useAddToCart();
  const { isAuthenticated } = useAuth();
  const {
    isOpen,
    productName: dialogProductName,
    showDialog,
    hideDialog,
  } = useAuthRequired();

  const { data: cartItems } = useCartProducts({ enabled: isAuthenticated });

  const { isProductInCart } = useCartChecks(cartItems);
  const isInCart = isProductInCart(productId);
  const isPreorder = availability === "PREORDER";

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      showDialog(productName);
      return;
    }

    if (isInCart) {
      router.push("/cart");
    } else {
      addToCart(productId, {
        onSuccess: () => {
          console.log("Товар успешно добавлен в корзину");
        },
        onError: (error) => {
          console.error("Ошибка добавления в корзину:", error);
        },
      });
    }
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
      if (isInCart) {
        // Товар предзаказа в корзине - светло-зеленый фон
        return {
          bgcolor: alpha(theme.palette.preorder.light, 0.3),
          color: theme.palette.preorder.dark,
          "&:hover": {
            bgcolor: alpha(theme.palette.preorder.light, 0.4),
          },
        };
      } else {
        // Товар предзаказа не в корзине - полный зеленый фон
        return {
          bgcolor: theme.palette.preorder.main,
          color: theme.palette.preorder.contrastText,
          "&:hover": {
            bgcolor: theme.palette.preorder.dark,
          },
        };
      }
    } else {
      // Обычный товар
      if (isInCart) {
        return {
          bgcolor: alpha(theme.palette.primary.light, 0.2),
          color: theme.palette.primary.main,
          "&:hover": {
            bgcolor: alpha(theme.palette.primary.light, 0.3),
          },
        };
      } else {
        return {
          "&:hover": {
            bgcolor: theme.palette.primary.dark,
          },
        };
      }
    }
  };

  const getButtonText = () => {
    if (isInCart) {
      return variant === "detailed" ? "Перейти в корзину" : "В корзине";
    }

    if (isPreorder) {
      return "Предзаказ";
    }

    return variant === "detailed" ? "В корзину" : "Купить";
  };

  return (
    <>
      <Button
        onClick={handleClick}
        variant="contained"
        fullWidth={fullWidth}
        disabled={isPending}
        size={size}
        startIcon={
          !isInCart && variant === "default" ? (
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
