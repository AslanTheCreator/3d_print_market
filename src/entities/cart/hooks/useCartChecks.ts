import { useCartProducts } from "./useCartQueries";

export const useCartChecks = () => {
  const { data: cartItems } = useCartProducts();

  const isProductInCart = (productId: number) =>
    cartItems?.some((item) => item.id === productId) ?? false;

  const getCartItemsCount = cartItems?.length ?? 0;

  const getCartTotal =
    cartItems?.reduce((total, item) => total + item.price * item.count, 0) ?? 0;

  return { isProductInCart, getCartItemsCount, getCartTotal };
};
