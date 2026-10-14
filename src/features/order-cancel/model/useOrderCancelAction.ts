import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { orderApi, orderQueryKeys, useCancelOrder } from "@/entities/order";
import type { ListOrdersDto, OrderCancel, OrderStatus } from "@/entities/order";
import { usePrivateScope } from "@/shared/lib/query";
import { ApiError } from "@/shared/lib/errorHandler";
import { useNotification } from "@/shared/ui/notification";

interface UseOrderCancelActionOptions {
  order: { orderId: number; actualStatus: OrderStatus };
  userRole: "seller" | "customer";
  onSuccess?: () => void;
}

interface OrderCancelActionResult {
  cancelOrder: (params: OrderCancel, onOperationSuccess?: () => void) => Promise<void>;
  isPending: boolean;
  requiresCheck: boolean;
  recoveryMessage: string;
  checkResult: (onOperationSuccess?: () => void) => Promise<void>;
}

export const useOrderCancelAction = ({
  order,
  userRole,
  onSuccess,
}: UseOrderCancelActionOptions): OrderCancelActionResult => {
  const { showNotification } = useNotification();
  const mutation = useCancelOrder();
  const queryClient = useQueryClient();
  const scope = usePrivateScope();
  const currentOrder = useRef(order);
  currentOrder.current = order;
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const lock = useRef(false);
  const accepted = useRef(false);
  const recovery = useRef<"none" | "rejected" | "unknown">("none");
  const [busy, setBusy] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const queryKey = scope.key(userRole === "seller" ? orderQueryKeys.sellerOrders() : orderQueryKeys.customerOrders());
  const isCurrent = () => mounted.current && scope.isCurrent() && currentOrder.current.orderId === order.orderId;

  const complete = (onOperationSuccess?: () => void) => {
    accepted.current = true;
    recovery.current = "none";
    setRecoveryMessage("");
    showNotification("Заказ успешно отменён", "success");
    onSuccess?.();
    onOperationSuccess?.();
  };

  const readResult = async (onOperationSuccess?: () => void) => {
    try {
      // Контрольное чтение не использует свежий по staleTime кэш или старый pending GET.
      await queryClient.cancelQueries({ queryKey, exact: true });
      if (!isCurrent()) return;
      const orders = await queryClient.fetchQuery({
        queryKey, staleTime: 0, retry: false,
        queryFn: ({ signal }) => userRole === "seller" ? orderApi.getSellerOrders(signal) : orderApi.getCustomerOrders(signal),
      });
      if (!isCurrent()) return;
      const status = orders.find(item => item.orderId === order.orderId)?.actualStatus;
      if (status === "CANCELLED") { complete(onOperationSuccess); return; }
      if (status && status !== "BOOKED") {
        recovery.current = "none";
        setRecoveryMessage("Статус заказа изменился. Прямая отмена недоступна.");
      } else if (status === "BOOKED" && recovery.current === "rejected") {
        recovery.current = "none";
        setRecoveryMessage("Отмена отклонена. Заказ перечитан; можно повторить попытку.");
      } else {
        setRecoveryMessage("Результат отмены не подтверждён. Повторная отправка заблокирована; проверьте результат позже.");
      }
    } catch {
      if (isCurrent()) setRecoveryMessage("Не удалось проверить результат отмены. Повторите загрузку; введённые данные сохранены.");
    }
  };

  const checkResult = async (onOperationSuccess?: () => void) => {
    if (lock.current || !isCurrent() || recovery.current === "none") return;
    lock.current = true; setBusy(true);
    try { await readResult(onOperationSuccess); }
    finally { lock.current = false; if (isCurrent()) setBusy(false); }
  };

  const cancelOrder = async (params: OrderCancel, onOperationSuccess?: () => void) => {
    if (lock.current || accepted.current || recovery.current !== "none" || !isCurrent()) return;
    const cached = queryClient.getQueryData<ListOrdersDto[]>(queryKey)?.find(item => item.orderId === order.orderId);
    if (queryClient.getQueryState(queryKey)?.status === "error") {
      setRecoveryMessage("Сначала обновите список заказов. Отмена по устаревшим данным недоступна.");
      return;
    }
    if (currentOrder.current.actualStatus !== "BOOKED" || (cached && cached.actualStatus !== "BOOKED")) {
      setRecoveryMessage("Прямая отмена доступна только для забронированного заказа.");
      return;
    }
    lock.current = true; setBusy(true); setRecoveryMessage("");
    try {
      await mutation.mutateAsync({ orderId: order.orderId, ...params });
      if (isCurrent()) complete(onOperationSuccess);
    } catch (error) {
      // Ошибка показана уведомлением; caller сохраняет ввод для повтора.
      if (!isCurrent()) return;
      showNotification("Не удалось подтвердить отмену заказа. Проверяем результат.", "error");
      const rejected = error instanceof ApiError && !!error.statusCode && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 408;
      recovery.current = rejected ? "rejected" : "unknown";
      await readResult(onOperationSuccess);
    } finally {
      lock.current = false;
      if (isCurrent()) setBusy(false);
    }
  };

  return {
    cancelOrder,
    isPending: busy || mutation.isPending,
    requiresCheck: recovery.current !== "none",
    recoveryMessage,
    checkResult,
  };
};
