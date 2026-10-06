import { usePrivateScope, usePrivateMutation } from "@/shared/lib/query";
import { useQueryClient } from "@tanstack/react-query";
import { addressApi } from "../api/addressApi";
import { addressKeys } from "./queryKeys";
import type { AddressInput } from "../model/types";
import { Address } from "./types";

export const useCreateAddress = () => {
  const scope = usePrivateScope();
  const queryClient = useQueryClient();

  return usePrivateMutation({
    mutationFn: addressApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scope.key(addressKeys.lists()) });
    },
  });
};

export const useUpdateAddress = () => {
  const scope = usePrivateScope();
  const queryClient = useQueryClient();

  return usePrivateMutation({
    mutationFn: ({ id, input }: { id: number; input: AddressInput }) =>
      addressApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scope.key(addressKeys.lists()) });
    },
  });
};

export const useDeleteAddress = () => {
  const scope = usePrivateScope();
  const queryClient = useQueryClient();

  return usePrivateMutation({
    mutationFn: addressApi.delete,

    onMutate: async (addressId: number) => {
      await queryClient.cancelQueries({ queryKey: scope.key(addressKeys.lists()) });
      if (!scope.isCurrent()) throw new Error("Session ended");
      const previousAddresses = queryClient.getQueryData<Address[]>(
        scope.key(addressKeys.lists()),
      );

      if (previousAddresses) {
        queryClient.setQueryData<Address[]>(
          scope.key(addressKeys.lists()),
          previousAddresses.filter((address) => address.id !== addressId),
        );
      }

      return { previousAddresses };
    },

    onError: (_err, _addressId, context) => {
      if (context?.previousAddresses) {
        queryClient.setQueryData(
          scope.key(addressKeys.lists()),
          context.previousAddresses,
        );
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: scope.key(addressKeys.lists()) });
    },
  });
};
