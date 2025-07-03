import { useQuery } from "@tanstack/react-query";
import { favoritesApi } from "../api/favoritesApi";
import { favoritesKeys } from "./queryKeys";
import { ProductCardModel } from "@/entities/product"; // Added import

// Хук для получения списка избранных товаров
export const useFavorites = () => {
  return useQuery<ProductCardModel[]>({ // Added type
    queryKey: favoritesKeys.lists(),
    queryFn: favoritesApi.getFavorites,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут (ранее cacheTime)
  });
};
