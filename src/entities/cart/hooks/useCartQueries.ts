import { useQuery } from "@tanstack/react-query";
import { cartApi } from "../api/cartApi";
import { cartKeys } from "./queryKeys";
import { CartProductModel } from "../model/types"; // Import the type

export const useCartProducts = () => {
  return useQuery<CartProductModel[]>({ // Specify the return type
    queryKey: cartKeys.all, // Use the new queryKeys
    queryFn: () => cartApi.getCart(),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
};
