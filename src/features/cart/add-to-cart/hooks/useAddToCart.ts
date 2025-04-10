import {
  useMutation,
  useQueryClient,
  UseMutationResult,
} from "@tanstack/react-query";
import { cartApi } from "@/entities/cart/api/cartApi";
export const useAddToCart = (): UseMutationResult<
  void,
  Error,
  { productId: number }
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId }: { productId: number }) => {
      return cartApi.addToCart(productId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
};
