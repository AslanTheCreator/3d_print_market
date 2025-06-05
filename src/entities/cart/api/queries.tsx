import { useQuery } from "@tanstack/react-query";
import { cartApi } from "../api/cartApi";

export const useCartProducts = () => {
  return useQuery({
    queryKey: ["cart"],
    queryFn: () => cartApi.getCart(),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
};
