import { useCancelOrder } from "@/entities/order";
import type { OrderCancel } from "@/entities/order";
import { useNotification } from "@/shared/ui/notification";

interface UseOrderCancelActionOptions {
  onSuccess?: () => void;
}

interface OrderCancelActionResult {
  cancelOrder: (params: OrderCancel, onOperationSuccess?: () => void) => Promise<void>;
  isPending: boolean;
}

export const useOrderCancelAction = ({
  onSuccess,
}: UseOrderCancelActionOptions = {}): OrderCancelActionResult => {
  const { showNotification } = useNotification();
  const mutation = useCancelOrder();

  const cancelOrder = async (params: OrderCancel, onOperationSuccess?: () => void) => {
    try {
      await mutation.mutateAsync(params, {
        onSuccess: () => {
          showNotification("Заказ успешно отменён", "success");
          onSuccess?.();
          onOperationSuccess?.();
        },
        onError: () => {
          showNotification("Не удалось отменить заказ", "error");
        },
      });
    } catch {
      // Ошибка показана уведомлением; caller сохраняет ввод для повтора.
    }
  };

  return {
    cancelOrder,
    isPending: mutation.isPending,
  };
};
