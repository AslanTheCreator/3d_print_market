import { useFavoritesProducts } from "@/entities/favorite";
import {
  useAddToFavorites,
  useRemoveFromFavorites,
} from "@/entities/favorite";
import { useNotification } from "@/shared/ui/notification";
import type { ApiError } from "@/shared/lib/errorHandler";

// Хук для переключения состояния избранного (добавить/удалить)
export const useToggleFavorite = (isAuthenticated: boolean) => {
  const { showNotification } = useNotification();
  const onError = (error: ApiError) => {
    showNotification(`Не удалось изменить избранное: ${error.message}`, "error");
  };
  const addToFavorites = useAddToFavorites({ onError });
  const removeFromFavorites = useRemoveFromFavorites({ onError });
  const { data: favorites = [] } = useFavoritesProducts(isAuthenticated);

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
