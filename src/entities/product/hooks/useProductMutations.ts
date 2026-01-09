import { useMutation, useQueryClient } from "@tanstack/react-query";
import { productApi } from "../api/productApi";
import { productKeys } from "./queryKeys";

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productApi.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
};
