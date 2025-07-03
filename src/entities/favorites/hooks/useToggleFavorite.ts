import { useFavorites } from "./useFavoritesQueries"; // Import from new location
import { useAddToFavorites, useRemoveFromFavorites } from "./useFavoritesMutations"; // Import from new location

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
