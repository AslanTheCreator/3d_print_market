import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addressApi } from "../api/addressApi";
import { addressKeys } from "./queryKeys";
import type { Address, AddressInput } from "../model/types";

export const useCreateAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addressApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: addressKeys.lists() });
    },
  });
};

export const useUpdateAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: AddressInput }) =>
      addressApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: addressKeys.lists() });
    },
  });
};

export const useDeleteAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addressApi.delete,

    onMutate: async (addressId: number) => {
      await queryClient.cancelQueries({ queryKey: addressKeys.lists() });
      const previousAddresses = queryClient.getQueryData<Address[]>(
        addressKeys.lists(),
      );

      if (previousAddresses) {
        queryClient.setQueryData<Address[]>(
          addressKeys.lists(),
          previousAddresses.filter((address) => address.id !== addressId),
        );
      }

      return { previousAddresses };
    },

    onError: (_err, _addressId, context) => {
      if (context?.previousAddresses) {
        queryClient.setQueryData(
          addressKeys.lists(),
          context.previousAddresses,
        );
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: addressKeys.lists() });
    },
  });
};
