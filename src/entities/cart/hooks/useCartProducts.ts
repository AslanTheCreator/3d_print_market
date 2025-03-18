import { CardItem } from "@/entities/product";
import { useQuery } from "@tanstack/react-query";
import { fetchCartProducts } from "../api/fetchCartProducts";

type UseCartProductsOptions = {
  token: string;
  staleTime?: number;
  retry?: number;
};

export const useCartProducts = ({
  token,
  staleTime = 1000 * 60 * 5,
  retry = 1,
}: UseCartProductsOptions) => {
  return useQuery<CardItem[], Error>({
    queryKey: ["cart"],
    queryFn: () => fetchCartProducts(token),
    enabled: Boolean(token), // Запрос будет выполнен только если token не пустой
    staleTime, // Время, в течение которого данные считаются актуальными
    retry, // Количество попыток повторного запроса в случае ошибки
  });
};
