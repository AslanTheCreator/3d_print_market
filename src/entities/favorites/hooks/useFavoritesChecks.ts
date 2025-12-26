import { useFavoritesProducts } from "./useFavoritesQueries"; // Import from new location
import { useAuth } from "@/features/auth";

export const useFavoritesChecks = () => {
  const { isAuthenticated } = useAuth();

  const { data: favorites } = useFavoritesProducts();

  const isProductInFavorites = (productId: number) => {
    if (!isAuthenticated) return false;
    return favorites?.some((item) => item.id === productId) ?? false;
  };

  const getFavoritesItemsCount = isAuthenticated ? favorites?.length ?? 0 : 0;

  return { isProductInFavorites, getFavoritesItemsCount };
};
