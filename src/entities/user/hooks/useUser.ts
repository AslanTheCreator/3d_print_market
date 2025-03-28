import { useQuery } from "@tanstack/react-query";
import { userApi } from "../api/userApi";
import { User } from "../model/types";
import { UseCartProductsOptions } from "@/entities/cart/hooks/useCartProducts";

export const useUser = ({
  token,
  staleTime = 1000 * 60 * 5,
  retry = 1,
}: UseCartProductsOptions) => {
  return useQuery<User, Error>({
    queryKey: ["user", token],
    queryFn: () => userApi.getUser(token),
    enabled: Boolean(token), // Запрос выполняется только при наличии токена
    staleTime,
    retry,
  });
};
