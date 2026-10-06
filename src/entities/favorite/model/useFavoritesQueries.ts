import { usePrivateScope } from "@/shared/lib/query";
import { useQuery } from "@tanstack/react-query";
import { favoritesApi } from "../api/favoritesApi";
import { favoritesKeys } from "./queryKeys";
import type { Product } from "@/entities/product/@x/favorite";

export const useFavoritesProducts = (enabled: boolean = true) => {
  const scope = usePrivateScope();
  return useQuery<Product[]>({
    queryKey: scope.key(favoritesKeys.lists()),
    queryFn: ({ signal }) => favoritesApi.getFavorites({ size: 50 }, signal),
    enabled: scope.id !== null && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
