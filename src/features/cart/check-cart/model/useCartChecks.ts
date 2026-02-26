import { useCartProducts, useCartQuantityStore } from "@/entities/cart";

export const useCartChecks = (isAuthenticated: boolean) => {
  const { data: cartItems } = useCartProducts({ enabled: isAuthenticated });
  const getQuantity = useCartQuantityStore((state) => state.getQuantity);

  const isProductInCart = (productId: number) => {
    if (!isAuthenticated) return false;
    return cartItems?.some((item) => item.product.id === productId) ?? false;
  };

  const getCartItemsCount = isAuthenticated ? (cartItems?.length ?? 0) : 0;

  // Общая сумма с учётом количества из Zustand
  const getCartTotal =
    cartItems?.reduce((total, item) => {
      const quantity = getQuantity(item.product.id);
      return total + item.product.price * quantity;
    }, 0) ?? 0;

  // Общее количество единиц товаров
  const getTotalQuantity =
    cartItems?.reduce((total, item) => {
      const quantity = getQuantity(item.product.id);
      return total + quantity;
    }, 0) ?? 0;

  return {
    isProductInCart,
    getCartItemsCount,
    getCartTotal,
    getTotalQuantity,
  };
};
