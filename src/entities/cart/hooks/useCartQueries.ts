import { useQuery } from "@tanstack/react-query";
import { cartApi } from "../api/cartApi";
import { cartKeys } from "./queryKeys";
import { CartProductModel } from "../model/types";
import { useAuth } from "@/features/auth";

export const useCartProducts = () => {
  const { isAuthenticated } = useAuth();

  return useQuery<CartProductModel[]>({
    queryKey: cartKeys.all,
    queryFn: () => cartApi.getCart(20),
    staleTime: 1000 * 60 * 5,
    retry: 1,
    enabled: isAuthenticated,
  });
};
