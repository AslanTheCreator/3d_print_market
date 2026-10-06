import { usePrivateScope, usePrivateMutation } from "@/shared/lib/query";
import { useQueryClient } from "@tanstack/react-query";
import type { Product } from "@/entities/product/@x/favorite";
import { favoriteProductKeys } from "@/entities/product/@x/favorite";
import { favoritesApi } from "../api/favoritesApi";
import { favoritesKeys } from "./queryKeys";

// Хук для добавления товара в избранное
export const useAddToFavorites = () => {
  const scope = usePrivateScope();
  const queryClient = useQueryClient();

  return usePrivateMutation({
    mutationFn: favoritesApi.addToFavorites,
    onMutate: async (productId: number) => {
      await queryClient.cancelQueries({ queryKey: scope.key(favoritesKeys.lists()) });
      if (!scope.isCurrent()) throw new Error("Session ended");
      const previousFavorites = queryClient.getQueryData<Product[]>(
        scope.key(favoritesKeys.lists()),
      );

      const productData = queryClient
        .getQueryCache()
        .findAll({ queryKey: favoriteProductKeys.lists() })
        .flatMap((query) => (query.state.data as Product[]) || [])
        .find((product) => product.id === productId);

      if (productData && previousFavorites) {
        queryClient.setQueryData<Product[]>(scope.key(favoritesKeys.lists()), (old) =>
          old ? [...old, productData] : [productData],
        );
      }

      return { previousFavorites };
    },
    onError: (error, productId, context) => {
      if (context?.previousFavorites) {
        queryClient.setQueryData(
          scope.key(favoritesKeys.lists()),
          context.previousFavorites,
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scope.key(favoritesKeys.lists()) });
    },
  });
};

// Хук для удаления товара из избранного
export const useRemoveFromFavorites = () => {
  const scope = usePrivateScope();
  const queryClient = useQueryClient();

  return usePrivateMutation({
    mutationFn: favoritesApi.removeFromFavorites,
    onMutate: async (productId: number) => {
      await queryClient.cancelQueries({ queryKey: scope.key(favoritesKeys.lists()) });
      if (!scope.isCurrent()) throw new Error("Session ended");
      const previousFavorites = queryClient.getQueryData<Product[]>(
        scope.key(favoritesKeys.lists()),
      );
      if (previousFavorites) {
        queryClient.setQueryData<Product[]>(
          scope.key(favoritesKeys.lists()),
          (old) => old?.filter((product) => product.id !== productId) || [],
        );
      }
      return { previousFavorites };
    },
    onError: (error, productId, context) => {
      if (context?.previousFavorites) {
        queryClient.setQueryData(
          scope.key(favoritesKeys.lists()),
          context.previousFavorites,
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scope.key(favoritesKeys.lists()) });
    },
  });
};
