import { useAuth } from "@/features/auth";
import { useCartProducts } from "./useCartQueries";

export const useCartChecks = () => {
  const { isAuthenticated } = useAuth();

  const { data: cartItems } = useCartProducts();

  const isProductInCart = (productId: number) => {
    if (!isAuthenticated) return false;
    return cartItems?.some((item) => item.id === productId) ?? false;
  };
  const getCartItemsCount = isAuthenticated ? cartItems?.length ?? 0 : 0;

  const getCartTotal =
    cartItems?.reduce((total, item) => total + item.price * item.count, 0) ?? 0;

  return { isProductInCart, getCartItemsCount, getCartTotal };
};
