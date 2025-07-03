import { useMutation, useQueryClient } from "@tanstack/react-query";
import { productApi } from "../api/productApi";
import { productKeys } from "./queryKeys";

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productApi.createProduct,
    onSuccess: () => {
      // Invalidate product lists or specific queries as needed
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      // Potentially redirect or show success message
    },
    onError: (error) => {
      console.error("Error creating product:", error);
      // Show error message
    },
  });
};
