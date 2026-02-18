import { useFavoritesProducts } from "@/entities/favorites";

export const useFavoritesChecks = (isAuthenticated: boolean) => {
  const { data: favorites } = useFavoritesProducts();

  const isProductInFavorites = (productId: number) => {
    if (!isAuthenticated) return false;
    return favorites?.some((item) => item.id === productId) ?? false;
  };

  const getFavoritesItemsCount = isAuthenticated ? (favorites?.length ?? 0) : 0;

  return { isProductInFavorites, getFavoritesItemsCount };
};
