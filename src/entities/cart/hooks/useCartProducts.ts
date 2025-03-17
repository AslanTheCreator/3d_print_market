import { CardItem } from "@/entities/product";
import { useQuery } from "@tanstack/react-query";
import { fetchCartProducts } from "../api/fetchCartProducts";

export const useCartProducts = (token: string) => {
  return useQuery<CardItem[], Error>({
    queryKey: ["cart"], // Уникальный ключ для кэширования
    queryFn: async () => {
      if (!token) throw new Error("Token is required");
      return await fetchCartProducts(token);
    },
    enabled: !!token, // Запрос выполнится только при наличии токена
    staleTime: 1000 * 60 * 5, // Данные считаются "свежими" 5 минут
    retry: 1, // Количество попыток повтора при ошибках
  });
};
