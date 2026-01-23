import { useCartQuantityStore } from "../model/cartQuantityStore";
import { useCartChecks } from "./useCartChecks";

interface UseCartQuantityOptions {
  maxQuantity?: number | null; // null означает неограниченное количество
}

export const useCartQuantity = (
  productId: number,
  options?: UseCartQuantityOptions,
) => {
  const { isProductInCart } = useCartChecks();
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

  // Проверяем, можно ли увеличить количество
  const canIncrement =
    maxQuantity === null || maxQuantity === undefined || quantity < maxQuantity;

  // Проверяем, достигнут ли лимит
  const isAtMaxQuantity =
    maxQuantity !== null &&
    maxQuantity !== undefined &&
    quantity >= maxQuantity;

  const handleIncrement = () => {
    // Если есть ограничение и достигнут лимит - не увеличиваем
    if (!canIncrement) {
      return;
    }
    incrementQuantity(productId);
  };

  const handleDecrement = () => {
    const currentQuantity = getQuantity(productId);

    if (currentQuantity <= 1) {
      removeItem(productId);
    } else {
      decrementQuantity(productId);
    }
  };

  const handleSetQuantity = (qty: number) => {
    if (qty <= 0) {
      removeItem(productId);
    } else {
      // Ограничиваем максимальным количеством
      const finalQuantity =
        maxQuantity !== null && maxQuantity !== undefined
          ? Math.min(qty, maxQuantity)
          : qty;
      setQuantity(productId, finalQuantity);
    }
  };

  // Корректировка количества при изменении maxQuantity
  const adjustQuantityToMax = () => {
    if (
      maxQuantity !== null &&
      maxQuantity !== undefined &&
      quantity > maxQuantity
    ) {
      if (maxQuantity <= 0) {
        removeItem(productId);
      } else {
        setQuantity(productId, maxQuantity);
      }
    }
  };

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
