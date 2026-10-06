import { usePrivateScope, usePrivateMutation } from "@/shared/lib/query";
import { serializeApiError } from "@/shared/lib/errorHandler";
import { useQueryClient } from "@tanstack/react-query";
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
    }: {
      productId: number;
      data: Parameters<typeof productApi.updateProduct>[1];
    }) => {
      await productApi.updateProduct(productId, data);
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
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
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
      await queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: scope.key(productKeys.userAll()) });
      await queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) });
    },
    onError: (error) => {
      console.error("Failed to delete product:", serializeApiError(error));
    },
  });
};
