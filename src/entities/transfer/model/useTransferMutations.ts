import { useMutation, useQueryClient } from "@tanstack/react-query";
import { transferApi } from "../api/transferApi";
import { transferKeys } from "./queryKeys";
import type { TransferInput } from "../model/types";
import { Transfer } from "@/shared/types";

export const useCreateTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: TransferInput) => transferApi.create(input),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: transferKeys.list() });
    },
  });
};

export const useUpdateTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: TransferInput }) =>
      transferApi.update(id, input),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: transferKeys.list() });
    },
  });
};

export const useDeleteTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => transferApi.delete(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: transferKeys.list() });
      const previous = queryClient.getQueryData<Transfer[]>(
        transferKeys.list(),
      );

      // Optimistically remove the deleted item from cache.
      queryClient.setQueryData<Transfer[]>(transferKeys.list(), (old = []) =>
        old.filter((t) => t.id !== id),
      );

      return { previous };
    },

    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(transferKeys.list(), context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: transferKeys.list() });
    },
  });
};
