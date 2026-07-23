import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cartApi } from "../api/cartApi";
import { useCartQuantityStore } from "./cartQuantityStore";
import { cartKeys } from "./queryKeys";
import { ProductBasket } from "./types";

const toServerQuantityItems = (cart: ProductBasket[]) =>
  cart.map((item) => ({
    productId: item.product.id,
    count: item.count,
  }));

let cartRefreshQueue: Promise<void> = Promise.resolve();

const enqueueCartRefresh = <T>(refresh: () => Promise<T>): Promise<T> => {
  const result = cartRefreshQueue.then(refresh, refresh);
  cartRefreshQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
};

export const useAddToCart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, count }: { productId: number; count: number }) =>
      cartApi.addToCart(productId, count),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });
};

export interface UpdateCartQuantityVariables {
  count: number;
  revision: number;
}

export interface UseUpdateCartQuantityOptions {
  onSyncError?: (error: unknown) => void;
}

export const useUpdateCartQuantity = (
  productId: number,
  options?: UseUpdateCartQuantityOptions,
) => {
  const queryClient = useQueryClient();

  const refreshCart = () =>
    enqueueCartRefresh(async () => {
      await queryClient.cancelQueries({ queryKey: cartKeys.all });
      const cart = await cartApi.getCart({ size: 100 });
      queryClient.setQueryData<ProductBasket[]>(cartKeys.all, cart);
      useCartQuantityStore
        .getState()
        .syncWithServer(toServerQuantityItems(cart));
      return cart;
    });

  return useMutation({
    mutationKey: [...cartKeys.all, "quantity", productId],
    scope: { id: `cart-quantity-${productId}` },
    mutationFn: ({ count }: UpdateCartQuantityVariables) =>
      cartApi.update(productId, count),
    onSuccess: async (_data, variables) => {
      const store = useCartQuantityStore.getState();
      store.acknowledgeUpdate(productId, variables.revision, variables.count);

      try {
        const cart = await refreshCart();
        const serverQuantity = cart.find(
          (item) => item.product.id === productId,
        )?.count;
        useCartQuantityStore
          .getState()
          .validateUpdate(productId, variables.revision, serverQuantity);
      } catch {
        useCartQuantityStore
          .getState()
          .markNeedsValidation(productId, variables.revision);
      }
    },
    onError: async (error, variables) => {
      const didRollback = useCartQuantityStore
        .getState()
        .rollbackUpdate(productId, variables.revision);

      if (didRollback) {
        options?.onSyncError?.(error);
      }

      try {
        const cart = await refreshCart();
        const serverQuantity = cart.find(
          (item) => item.product.id === productId,
        )?.count;
        useCartQuantityStore
          .getState()
          .validateUpdate(productId, variables.revision, serverQuantity);
      } catch {
        useCartQuantityStore
          .getState()
          .markNeedsValidation(productId, variables.revision);
      }
    },
  });
};

export const useRemoveFromCart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cartApi.removeFromCart,
    onMutate: async (productId: number) => {
      await queryClient.cancelQueries({ queryKey: cartKeys.all });

      const previousCart = queryClient.getQueryData<ProductBasket[]>(
        cartKeys.all,
      );

      if (previousCart) {
        const updatedCart = previousCart.filter(
          (item) => item.product.id !== productId,
        );
        queryClient.setQueryData<ProductBasket[]>(cartKeys.all, updatedCart);
      }

      return { previousCart };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData<ProductBasket[]>(
          cartKeys.all,
          context.previousCart,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });
};
