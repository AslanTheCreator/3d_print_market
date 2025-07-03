import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addressApi } from "../api/addressApi";
import { addressKeys } from "./queryKeys";
import { AddressBaseModel } from "../model/types"; // Added for useDeleteAddress context

export const useCreateAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addressApi.createAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: addressKeys.lists() });
    },
    onError: (error) => {
      console.error("Ошибка создания адреса:", error);
    },
  });
};

export const useDeleteAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addressApi.deleteAddress,
    onMutate: async (addressId: number) => {
      await queryClient.cancelQueries({ queryKey: addressKeys.lists() });
      const previousAddresses = queryClient.getQueryData<AddressBaseModel[]>(
        addressKeys.lists()
      );
      if (previousAddresses) {
        queryClient.setQueryData<AddressBaseModel[]>(
          addressKeys.lists(),
          previousAddresses.filter((address) => address.id !== addressId)
        );
      }
      return { previousAddresses };
    },
    onError: (err, addressId, context) => {
      if (context?.previousAddresses) {
        queryClient.setQueryData(
          addressKeys.lists(),
          context.previousAddresses
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: addressKeys.lists() });
    },
  });
};
