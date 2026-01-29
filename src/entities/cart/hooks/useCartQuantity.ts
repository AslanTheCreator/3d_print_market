import { useCallback, useRef } from "react";
import { useCartQuantityStore } from "../model/cartQuantityStore";
import { useCartChecks } from "./useCartChecks";
import { useUpdateCartQuantity } from "./useCartMutations";
import { debounce } from "lodash";

interface UseCartQuantityOptions {
  maxQuantity?: number | null; // null означает неограниченное количество
}

export const useCartQuantity = (
  productId: number,
  options?: UseCartQuantityOptions,
) => {
  const { isProductInCart } = useCartChecks();
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

  // Debounced функция для синхронизации с сервером
  // Используем ref чтобы сохранить между рендерами
  const debouncedUpdateRef = useRef(
    debounce((id: number, count: number) => {
      updateServerQuantity({ productId: id, count });
    }, 500),
  );

  // Синхронизация с сервером
  const syncWithServer = useCallback(
    (newQuantity: number) => {
      debouncedUpdateRef.current(productId, newQuantity);
    },
    [productId],
  );

  // Проверяем, можно ли увеличить количество
  const canIncrement =
    maxQuantity === null || maxQuantity === undefined || quantity < maxQuantity;

  // Проверяем, достигнут ли лимит
  const isAtMaxQuantity =
    maxQuantity !== null &&
    maxQuantity !== undefined &&
    quantity >= maxQuantity;

  const handleIncrement = useCallback(() => {
    if (!canIncrement) {
      return;
    }
    incrementQuantity(productId);
    syncWithServer(quantity + 1);
  }, [canIncrement, incrementQuantity, productId, quantity, syncWithServer]);

  const handleDecrement = useCallback(() => {
    const currentQuantity = getQuantity(productId);

    if (currentQuantity <= 1) {
      // Не удаляем здесь — это делает handleDecrementWithRemove в компоненте
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

      // Ограничиваем максимальным количеством
      const finalQuantity =
        maxQuantity !== null && maxQuantity !== undefined
          ? Math.min(qty, maxQuantity)
          : qty;

      setQuantity(productId, finalQuantity);
      syncWithServer(finalQuantity);
    },
    [maxQuantity, productId, removeItem, setQuantity, syncWithServer],
  );

  // Корректировка количества при изменении maxQuantity
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
