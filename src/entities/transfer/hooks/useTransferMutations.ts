import { useMutation, useQueryClient } from "@tanstack/react-query";
import { transferApi } from "../api/transferApi";
import { transferKeys } from "./queryKeys";
import { useNotification } from "@/app/providers";
import type { TransferBaseModel, TransferCreateModel } from "../model/types";

export const useCreateTransfer = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: transferApi.createTransfer,

    onMutate: async (newTransfer) => {
      await queryClient.cancelQueries({ queryKey: transferKeys.userList() });

      const previous = queryClient.getQueryData<TransferBaseModel[]>(
        transferKeys.userList()
      );

      queryClient.setQueryData<TransferBaseModel[]>(
        transferKeys.userList(),
        (old = []) => [
          ...old,
          {
            ...newTransfer,
            id: Date.now(),
            participantId: 0,
          } as TransferBaseModel,
        ]
      );

      return { previous };
    },

    onError: (error, _vars, context) => {
      queryClient.setQueryData(transferKeys.userList(), context?.previous);
      const msg =
        error instanceof Error
          ? error.message
          : "Не удалось добавить способ доставки";
      showNotification(msg, "error");
    },

    onSuccess: () => {
      showNotification("Способ доставки добавлен", "success");
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: transferKeys.userList() });
    },
  });
};

export const useDeleteTransfer = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: transferApi.deleteTransfer,

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: transferKeys.userList() });
      const previous = queryClient.getQueryData<TransferBaseModel[]>(
        transferKeys.userList()
      );

      queryClient.setQueryData<TransferBaseModel[]>(
        transferKeys.userList(),
        (old = []) => old.filter((t) => t.id !== id)
      );

      return { previous };
    },

    onError: (_err, _id, context) => {
      queryClient.setQueryData(transferKeys.userList(), context?.previous);
      showNotification("Не удалось удалить способ доставки", "error");
    },

    onSuccess: () => {
      showNotification("Способ доставки удалён", "success");
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: transferKeys.userList() });
    },
  });
};

interface SaveBatchInput {
  toCreate: TransferCreateModel[];
  toDelete: number[]; // id тех, что нужно удалить
}

export const useSaveTransfersBatch = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: async ({ toCreate, toDelete }: SaveBatchInput) => {
      // Параллельно: создаём новые + удаляем старые
      await Promise.all([
        ...toCreate.map((t) => transferApi.createTransfer(t)),
        ...toDelete.map((id) => transferApi.deleteTransfer(id)),
      ]);
    },

    // Оптимистическое обновление — идеально!
    onMutate: async ({ toCreate, toDelete }) => {
      await queryClient.cancelQueries({ queryKey: transferKeys.userList() });

      const previous = queryClient.getQueryData<TransferBaseModel[]>(
        transferKeys.userList()
      );

      queryClient.setQueryData<TransferBaseModel[]>(
        transferKeys.userList(),
        (old = []) => {
          // Удаляем те, что пользователь выключил
          let updated = old.filter((t) => !toDelete.includes(t.id));

          // Добавляем новые (с временным id)
          const newOnes = toCreate.map(
            (t) =>
              ({
                ...t,
                id: Date.now() + Math.random(), // временный id
                participantId: 0,
              } as TransferBaseModel)
          );

          return [...updated, ...newOnes];
        }
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      queryClient.setQueryData(transferKeys.userList(), context?.previous);
      showNotification("Не удалось сохранить способы доставки", "error");
    },

    onSuccess: () => {
      showNotification("Способы доставки сохранены", "success");
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: transferKeys.userList() });
    },
  });
};
