"use client";

import { useMemo } from "react";
import { CartProductModel, useCartQuantityStore } from "@/entities/cart";

const DELIVERY_THRESHOLD = 3000;
const DELIVERY_PRICE = 300;

export const useCheckoutTotals = (
  cartItems: CartProductModel[] | undefined,
) => {
  const { getQuantity } = useCartQuantityStore();

  return useMemo(() => {
    if (!cartItems?.length) {
      return { subtotal: 0, deliveryPrice: 0, total: 0, itemsCount: 0 };
    }

    let subtotal = 0;
    let itemsCount = 0;

    for (const item of cartItems) {
      const quantity = getQuantity(item.id);
      subtotal += item.price * quantity;
      itemsCount += quantity;
    }

    const deliveryPrice = subtotal > DELIVERY_THRESHOLD ? 0 : DELIVERY_PRICE;

    return {
      subtotal,
      deliveryPrice,
      total: subtotal + deliveryPrice,
      itemsCount,
    };
  }, [cartItems, getQuantity]);
};
