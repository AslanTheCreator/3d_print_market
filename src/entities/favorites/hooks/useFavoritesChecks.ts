import { useFavoritesProducts } from "./useFavoritesQueries"; // Import from new location

export const useFavoritesChecks = () => {
  const { data: favorites } = useFavoritesProducts();

  const isProductInFavorites = (productId: number) =>
    favorites?.some((item) => item.id === productId) ?? false;

  const getFavoritesItemsCount = favorites?.length ?? 0;

  return { isProductInFavorites, getFavoritesItemsCount };
};
