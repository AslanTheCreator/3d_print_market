import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cartApi } from "../api/cartApi";
import { cartKeys } from "./queryKeys";
import { ProductBasket } from "../model/types";

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

export const useUpdateCartQuantity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, count }: { productId: number; count: number }) =>
      cartApi.update(productId, count),
    // Не инвалидируем сразу — Zustand уже обновлён оптимистично
    // Инвалидация произойдёт при следующем фокусе или вручную
    onError: () => {
      // При ошибке инвалидируем, чтобы синхронизировать с сервером
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
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
