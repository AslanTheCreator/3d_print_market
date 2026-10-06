import { usePrivateScope, usePrivateMutation } from "@/shared/lib/query";
import { useQueryClient } from "@tanstack/react-query";
import { transferApi } from "../api/transferApi";
import { transferKeys } from "./queryKeys";
import type { TransferInput } from "../model/types";
import { Transfer } from "./types";

export const useCreateTransfer = () => {
  const scope = usePrivateScope();
  const queryClient = useQueryClient();

  return usePrivateMutation({
    mutationFn: (input: TransferInput) => transferApi.create(input),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: scope.key(transferKeys.list()) });
    },
  });
};

export const useUpdateTransfer = () => {
  const scope = usePrivateScope();
  const queryClient = useQueryClient();

  return usePrivateMutation({
    mutationFn: ({ id, input }: { id: number; input: TransferInput }) =>
      transferApi.update(id, input),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: scope.key(transferKeys.list()) });
    },
  });
};

export const useDeleteTransfer = () => {
  const scope = usePrivateScope();
  const queryClient = useQueryClient();

  return usePrivateMutation({
    mutationFn: (id: number) => transferApi.delete(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: scope.key(transferKeys.list()) });
      if (!scope.isCurrent()) throw new Error("Session ended");
      const previous = queryClient.getQueryData<Transfer[]>(
        scope.key(transferKeys.list()),
      );

      // Optimistically remove the deleted item from cache.
      queryClient.setQueryData<Transfer[]>(scope.key(transferKeys.list()), (old = []) =>
        old.filter((t) => t.id !== id),
      );

      return { previous };
    },

    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(scope.key(transferKeys.list()), context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: scope.key(transferKeys.list()) });
    },
  });
};
