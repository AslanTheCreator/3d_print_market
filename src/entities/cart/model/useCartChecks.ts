import { useCartProducts } from "./useCartQueries";
import type { ProductBasket } from "./types";

const membershipIndexes = new WeakMap<ProductBasket[], Set<number>>();

const getMembershipIndex = (cart: ProductBasket[]) => {
  let index = membershipIndexes.get(cart);
  if (!index) {
    index = new Set(cart.map(item => item.product.id));
    membershipIndexes.set(cart, index);
  }
  return index;
};

export const useCartChecks = (isAuthenticated: boolean) => {
  const { data: cartItems } = useCartProducts({ enabled: isAuthenticated });
  const productIds = isAuthenticated && cartItems ? getMembershipIndex(cartItems) : undefined;

  const isProductInCart = (productId: number) => {
    if (!isAuthenticated) return false;
    return productIds?.has(productId) ?? false;
  };

  const getCartItemsCount = isAuthenticated ? (cartItems?.length ?? 0) : 0;

  return {
    isProductInCart,
    getCartItemsCount,
  };
};
