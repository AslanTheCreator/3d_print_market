import { useQuery } from "@tanstack/react-query";
import { productApi } from "../api/productApi";

export const useProductById = (id: string) => {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => productApi.getProductById(id!),
    enabled: Boolean(id), // Запрос выполнится только если id существует
    staleTime: 5 * 60 * 1000, // 5 минут кэширования
    retry: 2,
  });
};
