import React from "react";
import { ButtonStyled } from "@/shared/ui";

interface AddToCartButtonProps {
  onAddToCart: () => void;
  isPending?: boolean;
  isInCart: boolean;
}

export const AddToCartButton: React.FC<AddToCartButtonProps> = ({
  onAddToCart,
  isPending = false,
  isInCart,
}) => (
  <ButtonStyled
    sx={{ borderRadius: "12px", fontSize: "16px" }}
    variant="contained"
    fullWidth
    onClick={onAddToCart}
  >
    {isInCart ? "Перейти в корзину" : "В корзину"}
  </ButtonStyled>
);
