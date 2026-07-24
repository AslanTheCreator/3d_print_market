import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Product } from "@/entities/product/@x/favorite";
import { favoriteProductKeys } from "@/entities/product/@x/favorite";
import { favoritesApi } from "../api/favoritesApi";
import { favoritesKeys } from "./queryKeys";

// Хук для добавления товара в избранное
export const useAddToFavorites = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: favoritesApi.addToFavorites,
    onMutate: async (productId: number) => {
      await queryClient.cancelQueries({ queryKey: favoritesKeys.lists() });
      const previousFavorites = queryClient.getQueryData<Product[]>(
        favoritesKeys.lists(),
      );

      const productData = queryClient
        .getQueryCache()
        .findAll({ queryKey: favoriteProductKeys.lists() })
        .flatMap((query) => (query.state.data as Product[]) || [])
        .find((product) => product.id === productId);

      if (productData && previousFavorites) {
        queryClient.setQueryData<Product[]>(favoritesKeys.lists(), (old) =>
          old ? [...old, productData] : [productData],
        );
      }

      return { previousFavorites };
    },
    onError: (error, productId, context) => {
      if (context?.previousFavorites) {
        queryClient.setQueryData(
          favoritesKeys.lists(),
          context.previousFavorites,
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: favoritesKeys.lists() });
    },
  });
};

// Хук для удаления товара из избранного
export const useRemoveFromFavorites = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: favoritesApi.removeFromFavorites,
    onMutate: async (productId: number) => {
      await queryClient.cancelQueries({ queryKey: favoritesKeys.lists() });
      const previousFavorites = queryClient.getQueryData<Product[]>(
        favoritesKeys.lists(),
      );
      if (previousFavorites) {
        queryClient.setQueryData<Product[]>(
          favoritesKeys.lists(),
          (old) => old?.filter((product) => product.id !== productId) || [],
        );
      }
      return { previousFavorites };
    },
    onError: (error, productId, context) => {
      if (context?.previousFavorites) {
        queryClient.setQueryData(
          favoritesKeys.lists(),
          context.previousFavorites,
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: favoritesKeys.lists() });
    },
  });
};
