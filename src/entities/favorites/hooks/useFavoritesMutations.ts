import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ProductCardModel } from "@/entities/product";
import { favoritesApi } from "../api/favoritesApi";
import { favoritesKeys } from "./queryKeys";

// Хук для добавления товара в избранное
export const useAddToFavorites = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: favoritesApi.addToFavorites,
    onMutate: async (productId: number) => {
      await queryClient.cancelQueries({ queryKey: favoritesKeys.lists() });
      const previousFavorites = queryClient.getQueryData<ProductCardModel[]>(
        favoritesKeys.lists()
      );

      const productData = queryClient
        .getQueryCache()
        .findAll({ queryKey: ["products"] }) // Assuming a general products key exists
        .flatMap((query) => (query.state.data as ProductCardModel[]) || [])
        .find((product) => product.id === productId);

      if (productData && previousFavorites) {
        queryClient.setQueryData<ProductCardModel[]>(
          favoritesKeys.lists(),
          (old) => (old ? [...old, productData] : [productData])
        );
      } else if (previousFavorites === undefined) {
      }

      return { previousFavorites };
    },
    onError: (error, productId, context) => {
      if (context?.previousFavorites) {
        queryClient.setQueryData(
          favoritesKeys.lists(),
          context.previousFavorites
        );
      }
      console.error("Ошибка добавления в избранное:", error);
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
      const previousFavorites = queryClient.getQueryData<ProductCardModel[]>(
        favoritesKeys.lists()
      );
      if (previousFavorites) {
        queryClient.setQueryData<ProductCardModel[]>(
          favoritesKeys.lists(),
          (old) => old?.filter((product) => product.id !== productId) || []
        );
      }
      return { previousFavorites };
    },
    onError: (error, productId, context) => {
      if (context?.previousFavorites) {
        queryClient.setQueryData(
          favoritesKeys.lists(),
          context.previousFavorites
        );
      }
      console.error("Ошибка удаления из избранного:", error);
    },
    onSuccess: () => {
      // Invalidation ensures consistency if optimistic update had issues
      // or if other state depends on this.
      queryClient.invalidateQueries({ queryKey: favoritesKeys.lists() });
    },
  });
};
