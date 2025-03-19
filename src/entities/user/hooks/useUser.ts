import { useQuery } from "@tanstack/react-query";
import { fetchUser } from "../api/fetchUser";
import { User } from "../model/types";
import { UseCartProductsOptions } from "@/entities/cart/hooks/useCartProducts";

export const useUser = ({
  token,
  staleTime = 1000 * 60 * 5,
  retry = 1,
}: UseCartProductsOptions) => {
  return useQuery<User, Error>({
    queryKey: ["user", token],
    queryFn: () => fetchUser(token),
    enabled: Boolean(token), // Запрос выполняется только при наличии токена
    staleTime,
    retry,
  });
};
