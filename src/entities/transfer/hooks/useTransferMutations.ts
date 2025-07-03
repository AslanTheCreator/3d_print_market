import { useMutation, useQueryClient } from "@tanstack/react-query";
import { transferApi } from "../api/transferApi";
import { transferKeys } from "./queryKeys";
import { TransferCreateModel } from "../model/types";

export const useCreateTransfer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TransferCreateModel) => transferApi.createTransfer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transferKeys.userTransfers() });
    },
    onError: (error) => {
      console.error("Error creating transfer:", error);
      // Здесь можно добавить обработку ошибок, например, показ уведомления
    },
  });
};

export const useDeleteTransfer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => transferApi.deleteTransfer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transferKeys.userTransfers() });
    },
    onError: (error) => {
      console.error("Error deleting transfer:", error);
      // Здесь можно добавить обработку ошибок
    },
  });
};
