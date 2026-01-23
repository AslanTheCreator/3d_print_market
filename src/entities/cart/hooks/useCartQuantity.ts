import { useCartQuantityStore } from "../model/cartQuantityStore";
import { useCartChecks } from "./useCartChecks";

export const useCartQuantity = (productId: number) => {
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

  const handleIncrement = () => {
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
      setQuantity(productId, qty);
    }
  };

  return {
    inCart,
    quantity,
    handleIncrement,
    handleDecrement,
    handleSetQuantity,
  };
};
