import { useFavoritesProducts } from "./useFavoritesQueries"; // Import from new location
import {
  useAddToFavorites,
  useRemoveFromFavorites,
} from "./useFavoritesMutations";

// Хук для переключения состояния избранного (добавить/удалить)
export const useToggleFavorite = () => {
  const addToFavorites = useAddToFavorites();
  const removeFromFavorites = useRemoveFromFavorites();
  const { data: favorites = [] } = useFavoritesProducts();

  const toggleFavorite = (productId: number) => {
    const isFavorite = favorites.some((product) => product.id === productId);

    if (isFavorite) {
      removeFromFavorites.mutate(productId);
    } else {
      addToFavorites.mutate(productId, {
        onSuccess: () => {
          console.log("Товар успешно добавлен в избранное");
        },
        onError: (error) => {
          console.error("Ошибка добавления в избранное:", error);
        },
      });
    }
  };

  return {
    toggleFavorite,
    isLoading: addToFavorites.isPending || removeFromFavorites.isPending,
  };
};
