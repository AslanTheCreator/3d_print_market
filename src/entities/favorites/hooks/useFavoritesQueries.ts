import { useQuery } from "@tanstack/react-query";
import { favoritesApi } from "../api/favoritesApi";
import { favoritesKeys } from "./queryKeys";
import { ProductCardModel } from "@/entities/product";

// Хук для получения списка избранных товаров
export const useFavoritesProducts = () => {
  return useQuery<ProductCardModel[]>({
    queryKey: favoritesKeys.lists(),
    queryFn: () => favoritesApi.getFavorites(50),
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут
  });
};
