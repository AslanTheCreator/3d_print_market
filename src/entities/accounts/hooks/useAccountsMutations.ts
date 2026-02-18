import { useMutation, useQueryClient } from "@tanstack/react-query";
import { accountsApi } from "../api/accountsApi";
import { accountsKeys } from "./queryKeys";
import type { AccountsCreateModel } from "../model/types";
import { AccountsBaseModel } from "@/shared/types";

export const useCreateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: accountsApi.createAccount,

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
      queryClient.invalidateQueries({ queryKey: accountsKeys.userList() });
    },
  });
};

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: accountsApi.deleteAccount,

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
      queryClient.invalidateQueries({ queryKey: accountsKeys.userList() });
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
        ...toCreate.map((acc) => accountsApi.createAccount(acc)),
        ...toDelete.map((id) => accountsApi.deleteAccount(id)),
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
      queryClient.invalidateQueries({ queryKey: accountsKeys.userList() });
    },
  });
};
