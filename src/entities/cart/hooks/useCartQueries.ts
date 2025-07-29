import { useQuery } from "@tanstack/react-query";
import { cartApi } from "../api/cartApi";
import { cartKeys } from "./queryKeys";
import { CartProductModel } from "../model/types";

export const useCartProducts = (options?: { enabled?: boolean }) => {
  return useQuery<CartProductModel[]>({
    queryKey: cartKeys.all,
    queryFn: () => cartApi.getCart(20),
    staleTime: 1000 * 60 * 5,
    retry: 1,
    enabled: options?.enabled ?? true,
  });
};
