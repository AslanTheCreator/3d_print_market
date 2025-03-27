import {
  useMutation,
  useQueryClient,
  UseMutationResult,
} from "@tanstack/react-query";
import { addProductToCard } from "../api/addToCart";
export const useAddToCart = (): UseMutationResult<
  void,
  Error,
  { token: string; productId: number }
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      token,
      productId,
    }: {
      token: string;
      productId: number;
    }) => {
      return addProductToCard(token, productId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
};
