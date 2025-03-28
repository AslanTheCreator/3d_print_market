import { useQuery } from "@tanstack/react-query";
import { userApi } from "../api/userApi";
import { User } from "../model/types";
import { UseCartProductsOptions } from "@/entities/cart/hooks/useCartProducts";

export const useUser = ({
  staleTime = 1000 * 60 * 5,
  retry = 1,
}: UseCartProductsOptions) => {
  return useQuery<User, Error>({
    queryKey: ["user"],
    queryFn: () => userApi.getUser(),
    staleTime,
    retry,
  });
};
