import { useCallback, useEffect, useRef } from "react";
import { debounce } from "lodash";
import { useCartChecks } from "./useCartChecks";
import { useCartQuantityStore } from "./cartQuantityStore";
import {
  UpdateCartQuantityVariables,
  useUpdateCartQuantity,
} from "./useCartMutations";

export interface UseCartQuantityOptions {
  maxQuantity?: number | null;
  onSyncError?: (error: unknown) => void;
}

export const useCartQuantity = (
  productId: number,
  isAuthenticated: boolean,
  options?: UseCartQuantityOptions,
) => {
  const { isProductInCart } = useCartChecks(isAuthenticated);
  const { mutate: updateServerQuantity } = useUpdateCartQuantity(productId, {
    onSyncError: options?.onSyncError,
  });
  const mutationRef = useRef(updateServerQuantity);

  useEffect(() => {
    mutationRef.current = updateServerQuantity;
  }, [updateServerQuantity]);

  const quantity = useCartQuantityStore((state) =>
    state.getQuantity(productId),
  );
  const syncStatus = useCartQuantityStore((state) =>
    state.getSyncStatus(productId),
  );
  const getQuantity = useCartQuantityStore((state) => state.getQuantity);
  const setQuantity = useCartQuantityStore((state) => state.setQuantity);
  const removeItem = useCartQuantityStore((state) => state.removeItem);

  const inCart = isProductInCart(productId);
  const maxQuantity = options?.maxQuantity;

  const debouncedUpdateRef = useRef(
    debounce((variables: UpdateCartQuantityVariables) => {
      mutationRef.current(variables);
    }, 500),
  );

  useEffect(() => {
    const debouncedUpdate = debouncedUpdateRef.current;

    return () => {
      debouncedUpdate.flush();
    };
  }, [productId]);

  const syncWithServer = useCallback(
    (newQuantity: number, revision: number) => {
      debouncedUpdateRef.current({ count: newQuantity, revision });
    },
    [],
  );

  const canIncrement =
    maxQuantity === null || maxQuantity === undefined || quantity < maxQuantity;

  const isAtMaxQuantity =
    maxQuantity !== null &&
    maxQuantity !== undefined &&
    quantity >= maxQuantity;

  const handleIncrement = useCallback(() => {
    const currentQuantity = getQuantity(productId);

    if (
      maxQuantity !== null &&
      maxQuantity !== undefined &&
      currentQuantity >= maxQuantity
    ) {
      return;
    }

    const nextQuantity = currentQuantity + 1;
    const revision = setQuantity(productId, nextQuantity);
    syncWithServer(nextQuantity, revision);
  }, [getQuantity, maxQuantity, productId, setQuantity, syncWithServer]);

  const handleDecrement = useCallback(() => {
    const currentQuantity = getQuantity(productId);

    if (currentQuantity <= 1) {
      return;
    }

    const nextQuantity = currentQuantity - 1;
    const revision = setQuantity(productId, nextQuantity);
    syncWithServer(nextQuantity, revision);
  }, [getQuantity, productId, setQuantity, syncWithServer]);

  const handleSetQuantity = useCallback(
    (requestedQuantity: number) => {
      if (requestedQuantity <= 0) {
        removeItem(productId);
        return;
      }

      const nextQuantity =
        maxQuantity !== null && maxQuantity !== undefined
          ? Math.min(requestedQuantity, maxQuantity)
          : requestedQuantity;
      const revision = setQuantity(productId, nextQuantity);
      syncWithServer(nextQuantity, revision);
    },
    [maxQuantity, productId, removeItem, setQuantity, syncWithServer],
  );

  // Оставлено для совместимости: актуальный остаток не должен автоматически
  // уменьшать уже выбранное пользователем количество.
  const adjustQuantityToMax = useCallback(() => undefined, []);

  return {
    inCart,
    quantity,
    syncStatus,
    maxQuantity,
    canIncrement,
    isAtMaxQuantity,
    handleIncrement,
    handleDecrement,
    handleSetQuantity,
    adjustQuantityToMax,
  };
};
