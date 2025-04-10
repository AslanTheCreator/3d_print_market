import { useQuery } from "@tanstack/react-query";
import { cartApi } from "../api/cartApi";
import { CartProductModel } from "../model/types";

export type UseCartProductsOptions = {
  staleTime?: number;
  retry?: number;
};

export const useCartProducts = ({
  staleTime = 1000 * 60 * 5,
  retry = 1,
}: UseCartProductsOptions) => {
  return useQuery<CartProductModel[], Error>({
    queryKey: ["cart"],
    queryFn: () => cartApi.getCart(),
    staleTime, // Время, в течение которого данные считаются актуальными
    retry, // Количество попыток повторного запроса в случае ошибки
  });
};
