import { useQuery } from "@tanstack/react-query";
import { favoritesApi } from "../api/favoritesApi";
import { favoritesKeys } from "./queryKeys";
import { Product } from "@/entities/product";
import { useAuth } from "@/features/auth";

export const useFavoritesProducts = () => {
  const { isAuthenticated } = useAuth();

  return useQuery<Product[]>({
    queryKey: favoritesKeys.lists(),
    queryFn: () => favoritesApi.getFavorites({ size: 50 }),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
