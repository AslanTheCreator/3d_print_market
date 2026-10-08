import { usePrivateScope, usePrivateMutation } from "@/shared/lib/query";
import { type InfiniteData, useQueryClient } from "@tanstack/react-query";
import type { Product } from "@/entities/product/@x/favorite";
import { favoriteProductKeys } from "@/entities/product/@x/favorite";
import { favoritesApi } from "../api/favoritesApi";
import { favoritesKeys } from "./queryKeys";
import { type ApiError, isApiCancellation, transformToApiError } from "@/shared/lib/errorHandler";

interface FavoritesMutationOptions {
  onError?: (error: ApiError) => void;
}

const operations = new WeakMap<AbortSignal, {
  revisions: Map<number, symbol>;
  pending: number;
}>();

const useFavoriteMutation = (adding: boolean, options?: FavoritesMutationOptions) => {
  const scope = usePrivateScope();
  const queryClient = useQueryClient();
  const queryKey = scope.key(favoritesKeys.lists());
  const mutationKey = [...queryKey, "toggle"];
  let scopeOperations = operations.get(scope.signal);
  if (!scopeOperations) {
    scopeOperations = { revisions: new Map(), pending: 0 };
    operations.set(scope.signal, scopeOperations);
  }
  const currentOperations = scopeOperations;
  const currentRevisions = currentOperations.revisions;

  return usePrivateMutation({
    mutationKey,
    mutationFn: adding ? favoritesApi.addToFavorites : favoritesApi.removeFromFavorites,
    onMutate: async (productId: number) => {
      currentOperations.pending++;
      await queryClient.cancelQueries({ queryKey });
      if (!scope.isCurrent()) throw new Error("Session ended");
      const revision = Symbol();
      currentRevisions.set(productId, revision);
      const previousItem = queryClient.getQueryData<Product[]>(queryKey)
        ?.find(product => product.id === productId);
      const productData = adding ? queryClient
        .getQueriesData<InfiniteData<Product[]>>({ queryKey: favoriteProductKeys.lists() })
        .flatMap(([, data]) => data?.pages.flat() ?? [])
        .find(product => product.id === productId) : undefined;

      queryClient.setQueryData<Product[]>(queryKey, old => {
        if (adding) {
          if (!productData || old?.some(product => product.id === productId)) return old;
          return [...(old ?? []), productData];
        }
        return old?.filter(product => product.id !== productId);
      });
      return { previousItem, revision };
    },
    onError: (error, productId, context) => {
      if (context && currentRevisions.get(productId) === context.revision) {
        queryClient.setQueryData<Product[]>(queryKey, old => {
          const otherItems = old?.filter(product => product.id !== productId);
          return context.previousItem
            ? [...(otherItems ?? []), context.previousItem]
            : otherItems;
        });
      }
      if (!isApiCancellation(error)) options?.onError?.(transformToApiError(error));
    },
    onSettled: () => {
      // Последняя операция сверяет весь список; ранний GET не затирает соседний optimistic toggle.
      // TanStack снимает pending после onSettled; собственный счётчик учитывает settlement синхронно.
      if (--currentOperations.pending === 0) {
        currentRevisions.clear();
        return queryClient.invalidateQueries({ queryKey });
      }
    },
  });
};

// Хук для добавления товара в избранное
export const useAddToFavorites = (options?: FavoritesMutationOptions) =>
  useFavoriteMutation(true, options);

// Хук для удаления товара из избранного
export const useRemoveFromFavorites = (options?: FavoritesMutationOptions) =>
  useFavoriteMutation(false, options);
