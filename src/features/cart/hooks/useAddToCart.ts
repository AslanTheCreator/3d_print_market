import {
  useMutation,
  useQueryClient,
  UseMutationResult,
  useQuery,
} from "@tanstack/react-query";
import { addToCart, fetchCartProducts } from "../api/addToCart";
import { CardItem } from "@/entities/product";
export const useAddToCart = (): UseMutationResult<
  void,
  Error,
  { token: string; productId: number }
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      token,
      productId,
    }: {
      token: string;
      productId: number;
    }) => {
      return addToCart(token, productId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
};

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
