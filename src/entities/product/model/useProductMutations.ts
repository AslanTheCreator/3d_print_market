import { useMutation, useQueryClient } from "@tanstack/react-query";
import { imageApi } from "@/shared/api";
import { productApi } from "../api/productApi";
import { productKeys } from "./queryKeys";

export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productApi.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.userLists() });
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      data,
      imageIdsToDelete = [],
    }: {
      productId: number;
      data: Parameters<typeof productApi.updateProduct>[1];
      imageIdsToDelete?: number[];
    }) => {
      await productApi.updateProduct(productId, data);
      await imageApi.deleteImages(imageIdsToDelete, "PRODUCT");
    },
    onSuccess: async (_, { productId }) => {
      await queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: productKeys.userAll() });
      await queryClient.invalidateQueries({
        queryKey: productKeys.detail(productId),
      });
    },
  });
};

export const useExtendProductExpiration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: number) =>
      productApi.extendProductExpiration(productId),
    onSuccess: (_, productId) => {
      queryClient.invalidateQueries({ queryKey: productKeys.userAll() });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) });
    },
    onError: (error) => {
      console.error("Failed to extend product expiration:", error);
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: number) => productApi.deleteProduct(productId),
    onSuccess: async (_, productId) => {
      await queryClient.invalidateQueries({ queryKey: productKeys.userAll() });
      await queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) });
    },
    onError: (error) => {
      console.error("Failed to delete product:", error);
    },
  });
};
