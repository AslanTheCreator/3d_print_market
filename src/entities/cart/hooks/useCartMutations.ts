import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cartApi } from "../api/cartApi";
import { cartKeys } from "./queryKeys";
import { CartProductModel } from "../model/types"; // For optimistic updates if implemented

export const useAddToCart = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cartApi.addToCart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
    // onError, onMutate, etc. can be added for more complex behavior
  });
};

export const useRemoveFromCart = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cartApi.removeFromCart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
    // Example of optimistic update (can be more detailed)
    onMutate: async (productId: number) => {
      await queryClient.cancelQueries({ queryKey: cartKeys.all });
      const previousCart = queryClient.getQueryData<CartProductModel[]>(cartKeys.all);
      if (previousCart) {
        const updatedCart = previousCart.filter(item => item.id !== productId);
        queryClient.setQueryData<CartProductModel[]>(cartKeys.all, updatedCart);
      }
      return { previousCart };
    },
    onError: (err, variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData<CartProductModel[]>(cartKeys.all, context.previousCart);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });
};
