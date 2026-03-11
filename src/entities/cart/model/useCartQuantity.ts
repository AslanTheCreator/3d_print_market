import { useCallback, useRef } from "react";
import { debounce } from "lodash";
import {
  useCartChecks,
  useCartQuantityStore,
  useUpdateCartQuantity,
} from "@/entities/cart";

interface UseCartQuantityOptions {
  maxQuantity?: number | null;
}

export const useCartQuantity = (
  productId: number,
  isAuthenticated: boolean,
  options?: UseCartQuantityOptions,
) => {
  const { isProductInCart } = useCartChecks(isAuthenticated);
  const { mutate: updateServerQuantity } = useUpdateCartQuantity();

  const {
    getQuantity,
    setQuantity,
    incrementQuantity,
    decrementQuantity,
    removeItem,
  } = useCartQuantityStore();

  const inCart = isProductInCart(productId);
  const quantity = getQuantity(productId);
  const maxQuantity = options?.maxQuantity;

  const debouncedUpdateRef = useRef(
    debounce((id: number, count: number) => {
      updateServerQuantity({ productId: id, count });
    }, 500),
  );

  const syncWithServer = useCallback(
    (newQuantity: number) => {
      debouncedUpdateRef.current(productId, newQuantity);
    },
    [productId],
  );

  const canIncrement =
    maxQuantity === null || maxQuantity === undefined || quantity < maxQuantity;

  const isAtMaxQuantity =
    maxQuantity !== null &&
    maxQuantity !== undefined &&
    quantity >= maxQuantity;

  const handleIncrement = useCallback(() => {
    if (!canIncrement) return;

    incrementQuantity(productId);
    syncWithServer(quantity + 1);
  }, [canIncrement, incrementQuantity, productId, quantity, syncWithServer]);

  const handleDecrement = useCallback(() => {
    const currentQuantity = getQuantity(productId);

    if (currentQuantity <= 1) {
      return;
    }

    decrementQuantity(productId);
    syncWithServer(currentQuantity - 1);
  }, [decrementQuantity, getQuantity, productId, syncWithServer]);

  const handleSetQuantity = useCallback(
    (qty: number) => {
      if (qty <= 0) {
        removeItem(productId);
        return;
      }

      const finalQuantity =
        maxQuantity !== null && maxQuantity !== undefined
          ? Math.min(qty, maxQuantity)
          : qty;

      setQuantity(productId, finalQuantity);
      syncWithServer(finalQuantity);
    },
    [maxQuantity, productId, removeItem, setQuantity, syncWithServer],
  );

  const adjustQuantityToMax = useCallback(() => {
    if (
      maxQuantity !== null &&
      maxQuantity !== undefined &&
      quantity > maxQuantity
    ) {
      if (maxQuantity <= 0) {
        removeItem(productId);
      } else {
        setQuantity(productId, maxQuantity);
        syncWithServer(maxQuantity);
      }
    }
  }, [
    maxQuantity,
    productId,
    quantity,
    removeItem,
    setQuantity,
    syncWithServer,
  ]);

  return {
    inCart,
    quantity,
    maxQuantity,
    canIncrement,
    isAtMaxQuantity,
    handleIncrement,
    handleDecrement,
    handleSetQuantity,
    adjustQuantityToMax,
  };
};
