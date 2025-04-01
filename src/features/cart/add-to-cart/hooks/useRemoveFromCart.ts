import {
  useMutation,
  useQueryClient,
  UseMutationResult,
} from "@tanstack/react-query";
import { addToCartService } from "../model/add-to-cart-service";

export const useRemoveFromCart = (): UseMutationResult<
  void,
  Error,
  { productId: number }
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId }: { productId: number }) => {
      return addToCartService.removeProduct(productId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
};
