import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ProductCardModel } from "@/entities/product";
import { favoritesApi } from "./favoritesApi";

// Ключи для React Query
export const favoritesKeys = {
  all: ["favorites"] as const,
  lists: () => [...favoritesKeys.all, "list"] as const,
} as const;

// Хук для получения списка избранных товаров
export const useFavorites = () => {
  return useQuery({
    queryKey: favoritesKeys.lists(),
    queryFn: favoritesApi.getFavorites,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут (ранее cacheTime)
  });
};

// Хук для добавления товара в избранное
export const useAddToFavorites = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: favoritesApi.addToFavorites,
    onMutate: async (productId: number) => {
      // Отменяем исходящие запросы для избранного
      await queryClient.cancelQueries({ queryKey: favoritesKeys.lists() });

      // Получаем предыдущие данные
      const previousFavorites = queryClient.getQueryData<ProductCardModel[]>(
        favoritesKeys.lists()
      );

      // Если у нас есть информация о продукте, добавляем его оптимистично
      // Здесь можно получить данные о продукте из другого кеша или передать их
      const productData = queryClient
        .getQueryCache()
        .findAll({ queryKey: ["products"] })
        .flatMap((query) => (query.state.data as ProductCardModel[]) || [])
        .find((product) => product.id === productId);

      if (productData && previousFavorites) {
        queryClient.setQueryData<ProductCardModel[]>(
          favoritesKeys.lists(),
          (old) => (old ? [...old, productData] : [productData])
        );
      }

      return { previousFavorites };
    },
    onError: (error, productId, context) => {
      // Откатываем изменения при ошибке
      if (context?.previousFavorites) {
        queryClient.setQueryData(
          favoritesKeys.lists(),
          context.previousFavorites
        );
      }
      console.error("Ошибка добавления в избранное:", error);
    },
    onSuccess: () => {
      // Обновляем кеш после успешного добавления
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
      // Отменяем исходящие запросы
      await queryClient.cancelQueries({ queryKey: favoritesKeys.lists() });

      // Получаем предыдущие данные
      const previousFavorites = queryClient.getQueryData<ProductCardModel[]>(
        favoritesKeys.lists()
      );

      // Оптимистично удаляем товар
      if (previousFavorites) {
        queryClient.setQueryData<ProductCardModel[]>(
          favoritesKeys.lists(),
          (old) => old?.filter((product) => product.id !== productId) || []
        );
      }

      return { previousFavorites };
    },
    onError: (error, productId, context) => {
      // Откатываем изменения при ошибке
      if (context?.previousFavorites) {
        queryClient.setQueryData(
          favoritesKeys.lists(),
          context.previousFavorites
        );
      }
      console.error("Ошибка удаления из избранного:", error);
    },
    onSuccess: () => {
      // Можно не делать invalidate, так как мы уже обновили кеш оптимистично
      // queryClient.invalidateQueries({ queryKey: favoritesKeys.lists() });
    },
  });
};

// Хук для проверки, находится ли товар в избранном
export const useIsFavorite = (productId: number) => {
  const { data: favorites = [] } = useFavorites();
  return favorites.some((product) => product.id === productId);
};

// Хук для переключения состояния избранного (добавить/удалить)
export const useToggleFavorite = () => {
  const addToFavorites = useAddToFavorites();
  const removeFromFavorites = useRemoveFromFavorites();
  const { data: favorites = [] } = useFavorites();

  const toggleFavorite = (productId: number) => {
    const isFavorite = favorites.some((product) => product.id === productId);

    if (isFavorite) {
      removeFromFavorites.mutate(productId);
    } else {
      addToFavorites.mutate(productId);
    }
  };

  return {
    toggleFavorite,
    isLoading: addToFavorites.isPending || removeFromFavorites.isPending,
  };
};
