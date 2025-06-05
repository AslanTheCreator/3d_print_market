import React from "react";
import { alpha, Button, useMediaQuery, useTheme } from "@mui/material";
import { useRouter } from "next/navigation";
import { useAddToCart } from "../hooks/useAddToCart";
import { useCartChecks } from "@/entities/cart";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";

interface AddToCartButtonProps {
  productId: number;
  variant?: "default" | "detailed";
  size?: "small" | "medium" | "large";
  fullWidth?: boolean;
}

export const AddToCartButton: React.FC<AddToCartButtonProps> = ({
  productId,
  variant = "default",
  size = "medium",
  fullWidth = true,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const router = useRouter();
  const { mutate: addToCart, isPending } = useAddToCart();

  const { isProductInCart } = useCartChecks();
  const isInCart = isProductInCart(productId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isInCart) {
      router.push("/cart");
    } else {
      addToCart(
        { productId },
        {
          onSuccess: () => {
            console.log("Товар успешно добавлен в корзину");
          },
          onError: (error) => {
            console.error("Ошибка добавления в корзину:", error);
            alert("Не удалось добавить товар в корзину.");
          },
        }
      );
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
    if (isInCart) {
      return {
        bgcolor: alpha(theme.palette.primary.light, 0.2),
        color: theme.palette.primary.main,
        "&:hover": {
          bgcolor: alpha(theme.palette.primary.light, 0.3),
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
    if (isInCart) {
      return variant === "detailed" ? "Перейти в корзину" : "В корзине";
    }
    return variant === "detailed" ? "В корзину" : "Купить";
  };

  return (
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
  );
};
