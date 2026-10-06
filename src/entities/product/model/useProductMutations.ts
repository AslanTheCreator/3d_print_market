import { usePrivateScope, usePrivateMutation } from "@/shared/lib/query";
import { serializeApiError } from "@/shared/lib/errorHandler";
import { useQueryClient } from "@tanstack/react-query";
import { imageApi } from "@/entities/image/@x/product";
import { productApi } from "../api/productApi";
import { productKeys } from "./queryKeys";

export const useCreateProduct = () => {
  const scope = usePrivateScope();
  const queryClient = useQueryClient();

  return usePrivateMutation({
    mutationFn: productApi.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: scope.key(productKeys.userLists()) });
    },
  });
};

export const useUpdateProduct = () => {
  const scope = usePrivateScope();
  const queryClient = useQueryClient();

  return usePrivateMutation({
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
      if (!scope.isCurrent()) throw new Error("Session ended");
      await imageApi.deleteImages(imageIdsToDelete, "PRODUCT");
    },
    onSuccess: async (_, { productId }) => {
      await queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: scope.key(productKeys.userAll()) });
      await queryClient.invalidateQueries({
        queryKey: productKeys.detail(productId),
      });
    },
  });
};

export const useExtendProductExpiration = () => {
  const scope = usePrivateScope();
  const queryClient = useQueryClient();

  return usePrivateMutation({
    mutationFn: (productId: number) =>
      productApi.extendProductExpiration(productId),
    onSuccess: (_, productId) => {
      queryClient.invalidateQueries({ queryKey: scope.key(productKeys.userAll()) });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) });
    },
    onError: (error) => {
      console.error("Failed to extend product expiration:", serializeApiError(error));
    },
  });
};

export const useDeleteProduct = () => {
  const scope = usePrivateScope();
  const queryClient = useQueryClient();

  return usePrivateMutation({
    mutationFn: (productId: number) => productApi.deleteProduct(productId),
    onSuccess: async (_, productId) => {
      await queryClient.invalidateQueries({ queryKey: scope.key(productKeys.userAll()) });
      await queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) });
    },
    onError: (error) => {
      console.error("Failed to delete product:", serializeApiError(error));
    },
  });
};
