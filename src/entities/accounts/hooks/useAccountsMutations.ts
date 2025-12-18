import { useMutation, useQueryClient } from "@tanstack/react-query";
import { accountsApi } from "../api/accountsApi";
import { accountsKeys } from "./queryKeys";
import { useNotification } from "@/app/providers";
import type { AccountsBaseModel, AccountsCreateModel } from "../model/types";

export const useCreateAccount = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: accountsApi.createAccount,

    onMutate: async (newAccount) => {
      await queryClient.cancelQueries({ queryKey: accountsKeys.userList() });

      const previous = queryClient.getQueryData<AccountsBaseModel[]>(
        accountsKeys.userList()
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
        ]
      );

      return { previous };
    },

    onError: (error, _vars, context) => {
      queryClient.setQueryData(accountsKeys.userList(), context?.previous);
      const msg =
        error instanceof Error
          ? error.message
          : "Не удалось добавить способ оплаты";
      showNotification(msg, "error");
    },

    onSuccess: () => {
      showNotification("Способ оплаты добавлен", "success");
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: accountsKeys.userList() });
    },
  });
};

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: accountsApi.deleteAccount,

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: accountsKeys.userList() });
      const previous = queryClient.getQueryData<AccountsBaseModel[]>(
        accountsKeys.userList()
      );

      queryClient.setQueryData<AccountsBaseModel[]>(
        accountsKeys.userList(),
        (old = []) => old.filter((account) => account.id !== id)
      );

      return { previous };
    },

    onError: (_err, _id, context) => {
      queryClient.setQueryData(accountsKeys.userList(), context?.previous);
      showNotification("Не удалось удалить способ оплаты", "error");
    },

    onSuccess: () => {
      showNotification("Способ оплаты удалён", "success");
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
  const { showNotification } = useNotification();

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
        accountsKeys.userList()
      );

      queryClient.setQueryData<AccountsBaseModel[]>(
        accountsKeys.userList(),
        (old = []) => {
          let updated = old.filter((acc) => !toDelete.includes(acc.id));

          const newOnes = toCreate.map(
            (acc) =>
              ({
                ...acc,
                id: Date.now() + Math.random(),
                participantId: 0,
              } as AccountsBaseModel)
          );

          return [...updated, ...newOnes];
        }
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      queryClient.setQueryData(accountsKeys.userList(), context?.previous);
      showNotification("Не удалось сохранить способы оплаты", "error");
    },

    onSuccess: () => {
      showNotification("Способы оплаты сохранены", "success");
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: accountsKeys.userList() });
    },
  });
};
