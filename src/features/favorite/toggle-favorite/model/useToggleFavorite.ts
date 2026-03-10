import { useFavoritesProducts } from "@/entities/favorite";
import {
  useAddToFavorites,
  useRemoveFromFavorites,
} from "@/entities/favorite";

// Хук для переключения состояния избранного (добавить/удалить)
export const useToggleFavorite = (isAuthenticated: boolean) => {
  const addToFavorites = useAddToFavorites();
  const removeFromFavorites = useRemoveFromFavorites();
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
