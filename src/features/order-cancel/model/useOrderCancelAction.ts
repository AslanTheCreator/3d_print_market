import { useCancelOrder } from "@/entities/order";
import type { OrderCancel } from "@/entities/order";
import { useNotification } from "@/shared/ui/notification";

interface UseOrderCancelActionOptions {
  onSuccess?: () => void;
}

interface OrderCancelActionResult {
  cancelOrder: (params: OrderCancel) => void;
  isPending: boolean;
}

export const useOrderCancelAction = ({
  onSuccess,
}: UseOrderCancelActionOptions = {}): OrderCancelActionResult => {
  const { showNotification } = useNotification();
  const mutation = useCancelOrder();

  const cancelOrder = (params: OrderCancel) => {
    mutation.mutate(params, {
      onSuccess: () => {
        showNotification("Заказ успешно отменён", "success");
        onSuccess?.();
      },
      onError: () => {
        showNotification("Не удалось отменить заказ", "error");
      },
    });
  };

  return {
    cancelOrder,
    isPending: mutation.isPending,
  };
};
