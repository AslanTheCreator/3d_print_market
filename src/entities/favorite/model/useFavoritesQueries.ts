import { useQuery } from "@tanstack/react-query";
import { favoritesApi } from "../api/favoritesApi";
import { favoritesKeys } from "./queryKeys";
import type { Product } from "@/entities/product/@x/favorite";

export const useFavoritesProducts = (enabled: boolean = true) => {
  return useQuery<Product[]>({
    queryKey: favoritesKeys.lists(),
    queryFn: () => favoritesApi.getFavorites({ size: 50 }),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
