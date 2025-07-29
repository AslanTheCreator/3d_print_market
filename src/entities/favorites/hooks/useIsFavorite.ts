import { useFavoritesProducts } from "./useFavoritesQueries"; // Import from new location

// Хук для проверки, находится ли товар в избранном
export const useIsFavorite = (productId: number) => {
  const { data: favorites = [] } = useFavoritesProducts();
  return favorites.some((product) => product.id === productId);
};
