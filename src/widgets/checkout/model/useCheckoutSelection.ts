"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProductBasket, useCartQuantityStore } from "@/entities/cart";

interface UseCheckoutSelectionProps {
  cartItems: ProductBasket[];
}

const areSetsEqual = (left: Set<number>, right: Set<number>) => {
  if (left.size !== right.size) {
    return false;
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }

  return true;
};

export const useCheckoutSelection = ({
  cartItems,
}: UseCheckoutSelectionProps) => {
  const initialized = useRef(cartItems.length > 0);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(
    () => new Set(cartItems.map((item) => item.product.id)),
  );

  useEffect(() => {
    const currentProductIds = new Set(cartItems.map((item) => item.product.id));
    if (!initialized.current && currentProductIds.size > 0) {
      initialized.current = true;
      setSelectedProductIds(currentProductIds);
      return;
    }

    setSelectedProductIds((prev) => {
      const next = new Set<number>();

      prev.forEach((id) => {
        if (currentProductIds.has(id)) {
          next.add(id);
        }
      });

      if (areSetsEqual(prev, next)) {
        return prev;
      }

      return next;
    });
  }, [cartItems]);

  const selectedItems = useMemo(() => {
    return cartItems.filter((item) => selectedProductIds.has(item.product.id));
  }, [cartItems, selectedProductIds]);

  const selectedCount = selectedProductIds.size;

  const isAllSelected = useMemo(() => {
    return (
      cartItems.length > 0 &&
      cartItems.every((item) => selectedProductIds.has(item.product.id))
    );
  }, [cartItems, selectedProductIds]);

  const toggleProductSelection = useCallback(
    (productId: number, selected: boolean) => {
      useCartQuantityStore.getState().noteCheckoutSelectionChange(productId);
      setSelectedProductIds((prev) => {
        const next = new Set(prev);

        if (selected) {
          next.add(productId);
        } else {
          next.delete(productId);
        }

        return next;
      });
    },
    [],
  );

  const toggleSelectAll = useCallback(
    (selected: boolean) => {
      for (const item of cartItems) {
        if (selectedProductIds.has(item.product.id) !== selected) {
          useCartQuantityStore.getState().noteCheckoutSelectionChange(item.product.id);
        }
      }
      if (selected) {
        setSelectedProductIds(new Set(cartItems.map((item) => item.product.id)));
        return;
      }

      setSelectedProductIds(new Set());
    },
    [cartItems, selectedProductIds],
  );

  return {
    selectedProductIds,
    selectedItems,
    selectedCount,
    isAllSelected,
    toggleProductSelection,
    toggleSelectAll,
  };
};
