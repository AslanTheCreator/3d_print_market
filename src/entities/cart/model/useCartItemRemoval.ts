import { useCallback, useState } from "react";
import { useRemoveFromCart } from "@/entities/cart";

export function useCartItemRemoval() {
  const { mutate: removeFromCart } = useRemoveFromCart();
  const [removingItemIds, setRemovingItemIds] = useState<number[]>([]);

  const handleRemoveItem = useCallback(
    (productId: number) => {
      setRemovingItemIds((prev) => [...prev, productId]);

      removeFromCart(productId, {
        onSettled: () => {
          setRemovingItemIds((prev) => prev.filter((id) => id !== productId));
        },
      });
    },
    [removeFromCart],
  );

  return { handleRemoveItem, removingItemIds };
}
