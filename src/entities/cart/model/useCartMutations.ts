import { usePrivateScope, usePrivateMutation } from "@/shared/lib/query";
import { useQueryClient } from "@tanstack/react-query";
import { cartApi } from "../api/cartApi";
import { useCartQuantityStore } from "./cartQuantityStore";
import { cartKeys } from "./queryKeys";
import { ProductBasket } from "./types";
import { type ApiError, isApiCancellation, transformToApiError } from "@/shared/lib/errorHandler";

const cartRefreshQueues = new WeakMap<AbortSignal, Promise<void>>();

const enqueueCartRefresh = <T>(signal: AbortSignal, refresh: () => Promise<T>): Promise<T> => {
  const cartRefreshQueue = cartRefreshQueues.get(signal) ?? Promise.resolve();
  const result = cartRefreshQueue.then(refresh, refresh);
  cartRefreshQueues.set(signal, result.then(
    () => undefined,
    () => undefined,
  ));
  return result;
};

export const useAddToCart = () => {
  const scope = usePrivateScope();
  const queryClient = useQueryClient();

  return usePrivateMutation({
    mutationFn: ({ productId, count }: { productId: number; count: number }) =>
      cartApi.addToCart(productId, count),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scope.key(cartKeys.all) });
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
  const scope = usePrivateScope();
  const queryClient = useQueryClient();

  const refreshCart = () =>
    enqueueCartRefresh(scope.signal, async () => {
      if (!scope.isCurrent()) throw new Error("Session ended");
      await queryClient.cancelQueries({ queryKey: scope.key(cartKeys.all) });
      if (!scope.isCurrent()) throw new Error("Session ended");
      const cart = await cartApi.getCart({ size: 100 }, scope.signal);
      if (!scope.isCurrent()) throw new Error("Session ended");
      queryClient.setQueryData<ProductBasket[]>(scope.key(cartKeys.all), cart);
      return cart;
    });

  return usePrivateMutation({
    mutationKey: [...scope.key(cartKeys.all), "quantity", productId],
    scope: { id: `cart-quantity-${scope.id}-${productId}` },
    mutationFn: ({ count }: UpdateCartQuantityVariables) =>
      cartApi.update(productId, count),
    onSuccess: async (_data, variables) => {
      const store = useCartQuantityStore.getState();
      store.acknowledgeUpdate(productId, variables.revision, variables.count);

      try {
        const cart = await refreshCart();
        if (!scope.isCurrent()) return;
        const serverQuantity = cart.find(
          (item) => item.product.id === productId,
        )?.count;
        useCartQuantityStore
          .getState()
          .validateUpdate(productId, variables.revision, serverQuantity);
      } catch {
        if (!scope.isCurrent()) return;
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
        if (!scope.isCurrent()) return;
        const serverQuantity = cart.find(
          (item) => item.product.id === productId,
        )?.count;
        useCartQuantityStore
          .getState()
          .validateUpdate(productId, variables.revision, serverQuantity);
      } catch {
        if (!scope.isCurrent()) return;
        useCartQuantityStore
          .getState()
          .markNeedsValidation(productId, variables.revision);
      }
    },
  });
};

export interface RemoveFromCartOptions {
  onError?: (error: ApiError, productId: number) => void;
}

export const useRemoveFromCart = (options?: RemoveFromCartOptions) => {
  const scope = usePrivateScope();
  const queryClient = useQueryClient();

  return usePrivateMutation({
    mutationFn: cartApi.removeFromCart,
    onMutate: async (productId: number) => {
      await queryClient.cancelQueries({ queryKey: scope.key(cartKeys.all) });
      if (!scope.isCurrent()) throw new Error("Session ended");

      const previousCart = queryClient.getQueryData<ProductBasket[]>(
        scope.key(cartKeys.all),
      );

      if (previousCart) {
        const updatedCart = previousCart.filter(
          (item) => item.product.id !== productId,
        );
        queryClient.setQueryData<ProductBasket[]>(scope.key(cartKeys.all), updatedCart);
      }

      return { previousCart };
    },
    onError: (error, productId, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData<ProductBasket[]>(
          scope.key(cartKeys.all),
          context.previousCart,
        );
      }
      if (!isApiCancellation(error)) options?.onError?.(transformToApiError(error), productId);
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: scope.key(cartKeys.all) });
    },
  });
};
