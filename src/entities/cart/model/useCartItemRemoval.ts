import { useCallback, useRef, useState } from "react";
import { useRemoveFromCart, type RemoveFromCartOptions } from "./useCartMutations";

export function useCartItemRemoval(options?: RemoveFromCartOptions) {
  const { mutateAsync: removeFromCart } = useRemoveFromCart(options);
  const pendingIds = useRef(new Set<number>());
  const [removingItemIds, setRemovingItemIds] = useState<number[]>([]);

  const handleRemoveItem = useCallback(
    (productId: number) => {
      if (pendingIds.current.has(productId)) return;
      pendingIds.current.add(productId);
      setRemovingItemIds((prev) => [...prev, productId]);

      void removeFromCart(productId).catch(() => {
        // Ошибку передаёт onError mutation; она не зависит от результата GET.
      }).finally(() => {
        pendingIds.current.delete(productId);
        setRemovingItemIds((prev) => prev.filter((id) => id !== productId));
      });
    },
    [removeFromCart],
  );

  return { handleRemoveItem, removingItemIds };
}
