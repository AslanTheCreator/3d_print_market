import React from "react";
import { ButtonStyled } from "@/shared/ui";

interface AddToCartButtonProps {
  onAddToCart: () => void;
  isPending?: boolean;
}

const AddToCartButton: React.FC<AddToCartButtonProps> = ({
  onAddToCart,
  isPending = false,
}) => (
  <ButtonStyled
    sx={{ borderRadius: "12px", fontSize: "16px" }}
    variant="contained"
    fullWidth
    onClick={onAddToCart}
    disabled={isPending}
  >
    {isPending ? "Добавление..." : "Добавить в корзину"}
  </ButtonStyled>
);

export default AddToCartButton;
