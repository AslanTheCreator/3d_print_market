"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ProductBasket } from "@/entities/cart";

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
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(
    () => new Set(cartItems.map((item) => item.product.id)),
  );

  useEffect(() => {
    const currentProductIds = new Set(cartItems.map((item) => item.product.id));

    setSelectedProductIds((prev) => {
      const next = new Set<number>();

      prev.forEach((id) => {
        if (currentProductIds.has(id)) {
          next.add(id);
        }
      });

      if (next.size === 0 && currentProductIds.size > 0) {
        if (areSetsEqual(prev, currentProductIds)) {
          return prev;
        }

        return currentProductIds;
      }

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
      if (selected) {
        setSelectedProductIds(new Set(cartItems.map((item) => item.product.id)));
        return;
      }

      setSelectedProductIds(new Set());
    },
    [cartItems],
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
