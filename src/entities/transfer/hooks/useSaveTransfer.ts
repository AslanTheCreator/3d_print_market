import { useCallback, useMemo } from "react";
import {
  useCreateTransfer,
  useUpdateTransfer,
  useDeleteTransfer,
} from "./useTransferMutations";
import { useTransfers } from "./useTransfers";
import type { Transfer, TransferInput, ShippingMethod } from "../model/types";

interface SaveTransferParams {
  method: ShippingMethod;
  enabled: boolean;
  input: TransferInput;
}

/**
 * Хук для удобного сохранения трансфера из формы.
 * Автоматически определяет операцию: create, update или delete.
 */
export const useSaveTransfer = () => {
  const { data: transfers = [] } = useTransfers();

  const createMutation = useCreateTransfer();
  const updateMutation = useUpdateTransfer();
  const deleteMutation = useDeleteTransfer();

  // Маппинг существующих трансферов по методу доставки
  const transfersByMethod = useMemo(() => {
    return transfers.reduce<Partial<Record<ShippingMethod, Transfer>>>(
      (acc, transfer) => {
        acc[transfer.sending] = transfer;
        return acc;
      },
      {},
    );
  }, [transfers]);

  // Проверка, изменились ли данные
  const hasChanges = useCallback(
    (existing: Transfer, input: TransferInput): boolean => {
      return (
        existing.price !== input.price || existing.currency !== input.currency
      );
    },
    [],
  );

  // Сохранение одного трансфера
  const save = useCallback(
    async ({ method, enabled, input }: SaveTransferParams) => {
      const existing = transfersByMethod[method];

      if (enabled) {
        if (existing) {
          // Обновляем только если есть изменения
          if (hasChanges(existing, input)) {
            await updateMutation.mutateAsync({ id: existing.id, input });
          }
        } else {
          // Создаём новый
          await createMutation.mutateAsync(input);
        }
      } else if (existing) {
        // Удаляем если был включен, но теперь выключен
        await deleteMutation.mutateAsync(existing.id);
      }
    },
    [
      transfersByMethod,
      hasChanges,
      createMutation,
      updateMutation,
      deleteMutation,
    ],
  );

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  return {
    save,
    isPending,
    transfersByMethod,
  };
};
