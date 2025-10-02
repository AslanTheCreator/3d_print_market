import { useMemo } from "react";
import { CartProductModel } from "@/entities/cart";

const DELIVERY_THRESHOLD = 3000;
const DELIVERY_PRICE = 300;

export const useCheckoutTotals = (
  cartItems: CartProductModel[] | undefined
) => {
  return useMemo(() => {
    if (!cartItems?.length) {
      return { subtotal: 0, deliveryPrice: 0, total: 0 };
    }

    const subtotal = cartItems.reduce((sum, item) => sum + item.price * 1, 0);
    const deliveryPrice = subtotal > DELIVERY_THRESHOLD ? 0 : DELIVERY_PRICE;

    return {
      subtotal,
      deliveryPrice,
      total: subtotal + deliveryPrice,
    };
  }, [cartItems]);
};
