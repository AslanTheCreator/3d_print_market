import { useMutation, useQueryClient } from "@tanstack/react-query";
import { accountsApi } from "../api/accountsApi";
import { accountsKeys } from "./queryKeys";
import type { AccountsCreateModel } from "./types";
import { AccountsBaseModel } from "@/shared/types";

export const useCreateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: accountsApi.create,

    onMutate: async (newAccount) => {
      await queryClient.cancelQueries({ queryKey: accountsKeys.userList() });

      const previous = queryClient.getQueryData<AccountsBaseModel[]>(
        accountsKeys.userList(),
      );

      queryClient.setQueryData<AccountsBaseModel[]>(
        accountsKeys.userList(),
        (old = []) => [
          ...old,
          {
            ...newAccount,
            id: Date.now(),
            participantId: 0,
          } as AccountsBaseModel,
        ],
      );

      return { previous };
    },

    onError: (_error, _vars, context) => {
      queryClient.setQueryData(accountsKeys.userList(), context?.previous);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: accountsKeys.all });
    },
  });
};

export const useUpdateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: AccountsCreateModel }) =>
      accountsApi.update(id, input),

    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: accountsKeys.userList() });

      const previous = queryClient.getQueryData<AccountsBaseModel[]>(
        accountsKeys.userList(),
      );

      queryClient.setQueryData<AccountsBaseModel[]>(
        accountsKeys.userList(),
        (old = []) =>
          old.map((account) =>
            account.id === id ? { ...account, ...input } : account,
          ),
      );

      return { previous };
    },

    onError: (_error, _vars, context) => {
      queryClient.setQueryData(accountsKeys.userList(), context?.previous);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: accountsKeys.all });
    },
  });
};

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: accountsApi.delete,

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: accountsKeys.userList() });
      const previous = queryClient.getQueryData<AccountsBaseModel[]>(
        accountsKeys.userList(),
      );

      queryClient.setQueryData<AccountsBaseModel[]>(
        accountsKeys.userList(),
        (old = []) => old.filter((account) => account.id !== id),
      );

      return { previous };
    },

    onError: (_err, _id, context) => {
      queryClient.setQueryData(accountsKeys.userList(), context?.previous);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: accountsKeys.all });
    },
  });
};

interface SaveBatchInput {
  toCreate: AccountsCreateModel[];
  toDelete: number[];
}

export const useSaveAccountsBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ toCreate, toDelete }: SaveBatchInput) => {
      await Promise.all([
        ...toCreate.map((acc) => accountsApi.create(acc)),
        ...toDelete.map((id) => accountsApi.delete(id)),
      ]);
    },

    onMutate: async ({ toCreate, toDelete }) => {
      await queryClient.cancelQueries({ queryKey: accountsKeys.userList() });

      const previous = queryClient.getQueryData<AccountsBaseModel[]>(
        accountsKeys.userList(),
      );

      queryClient.setQueryData<AccountsBaseModel[]>(
        accountsKeys.userList(),
        (old = []) => {
          const updated = old.filter((acc) => !toDelete.includes(acc.id));

          const newOnes = toCreate.map(
            (acc) =>
              ({
                ...acc,
                id: -(Date.now() + Math.floor(Math.random() * 1000)),
                participantId: 0,
              }) as AccountsBaseModel,
          );

          return [...updated, ...newOnes];
        },
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      queryClient.setQueryData(accountsKeys.userList(), context?.previous);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: accountsKeys.all });
    },
  });
};
