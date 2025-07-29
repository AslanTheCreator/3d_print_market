import { useMemo } from "react";
import { CartProductModel } from "../model/types";

export const useCartChecks = (cartItems?: CartProductModel[]) => {
  const isProductInCart = useMemo(() => {
    return (productId: number) => {
      return Boolean(cartItems?.some((item) => item.id === productId));
    };
  }, [cartItems]);

  const getCartTotal = useMemo(() => {
    return (
      cartItems?.reduce((total, item) => total + item.price * item.count, 0) ||
      0
    );
  }, [cartItems]);

  const getCartItemsCount = useMemo(() => {
    return cartItems?.reduce((total, item) => total + item.count, 0) || 0;
  }, [cartItems]);

  return { isProductInCart, getCartItemsCount, getCartTotal };
};
