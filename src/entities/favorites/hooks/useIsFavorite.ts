import { useAuth } from "@/features/auth";
import { useFavoritesProducts } from "./useFavoritesQueries"; // Import from new location

// Хук для проверки, находится ли товар в избранном
export const useIsFavorite = (productId: number) => {
  const { isAuthenticated } = useAuth();
  const { data: favorites = [] } = useFavoritesProducts();

  if (!isAuthenticated) {
    return false;
  }

  return favorites.some((product) => product.id === productId);
};
