import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  isAccepted: boolean;
  draft: { reason: string; comment: string };
  setDraft: (draft: Partial<CancelActionState["draft"]>) => void;
  resetDraft: () => void;
  requiresCheck: boolean;
  recoveryMessage: string;
  checkResult: (onOperationSuccess?: () => void) => Promise<void>;
}

interface CancelActionState {
  busy: boolean;
  accepted: boolean;
  recovery: "none" | "rejected" | "unknown";
  recoveryMessage: string;
  draft: { reason: string; comment: string };
}

const initialState: CancelActionState = {
  busy: false, accepted: false, recovery: "none", recoveryMessage: "",
  draft: { reason: "", comment: "" },
};

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
  // Общий guard и ввод живут до завершения приватного scope, а не до unmount формы.
  const actionKey = scope.key(["orderCancel", order.orderId]);
  const { data: state } = useQuery({
    queryKey: actionKey, queryFn: () => initialState, initialData: initialState,
    enabled: false, staleTime: Infinity, gcTime: Infinity,
  });
  const getState = () => queryClient.getQueryData<CancelActionState>(actionKey) ?? initialState;
  const update = (patch: Partial<CancelActionState>) => {
    if (scope.isCurrent()) queryClient.setQueryData<CancelActionState>(actionKey, previous => ({ ...(previous ?? initialState), ...patch }));
  };
  const queryKey = scope.key(userRole === "seller" ? orderQueryKeys.sellerOrders() : orderQueryKeys.customerOrders());
  const isCurrent = () => mounted.current && scope.isCurrent() && currentOrder.current.orderId === order.orderId;

  const complete = (onOperationSuccess?: () => void) => {
    update({ accepted: true, recovery: "none", recoveryMessage: "Заказ успешно отменён." });
    if (!isCurrent()) return;
    showNotification("Заказ успешно отменён", "success");
    onSuccess?.();
    onOperationSuccess?.();
  };

  const readResult = async (onOperationSuccess?: () => void) => {
    try {
      // Контрольное чтение не использует свежий по staleTime кэш или старый pending GET.
      await queryClient.cancelQueries({ queryKey, exact: true });
      if (!scope.isCurrent()) return;
      const orders = await queryClient.fetchQuery({
        queryKey, staleTime: 0, retry: false,
        queryFn: ({ signal }) => userRole === "seller" ? orderApi.getSellerOrders(signal) : orderApi.getCustomerOrders(signal),
      });
      if (!scope.isCurrent()) return;
      const status = orders.find(item => item.orderId === order.orderId)?.actualStatus;
      if (status === "CANCELLED") { complete(onOperationSuccess); return; }
      if (status && status !== "BOOKED") {
        update({ recoveryMessage: "Статус заказа изменился. Прямая отмена недоступна." });
      } else if (status === "BOOKED" && getState().recovery === "rejected") {
        update({ recovery: "none", recoveryMessage: "Отмена отклонена. Заказ перечитан; можно повторить попытку." });
      } else {
        update({ recoveryMessage: "Результат отмены не подтверждён. Повторная отправка заблокирована; проверьте результат позже." });
      }
    } catch {
      update({ recoveryMessage: "Не удалось проверить результат отмены. Повторите загрузку; введённые данные сохранены." });
    }
  };

  const checkResult = async (onOperationSuccess?: () => void) => {
    if (getState().busy || !isCurrent() || getState().recovery === "none") return;
    update({ busy: true });
    try { await readResult(onOperationSuccess); }
    finally { update({ busy: false }); }
  };

  const cancelOrder = async (params: OrderCancel, onOperationSuccess?: () => void) => {
    const current = getState();
    if (current.busy || current.accepted || current.recovery !== "none" || !isCurrent()) return;
    const cached = queryClient.getQueryData<ListOrdersDto[]>(queryKey)?.find(item => item.orderId === order.orderId);
    if (queryClient.getQueryState(queryKey)?.status === "error") {
      update({ recoveryMessage: "Сначала обновите список заказов. Отмена по устаревшим данным недоступна." });
      return;
    }
    if (currentOrder.current.actualStatus !== "BOOKED" || (cached && cached.actualStatus !== "BOOKED")) {
      update({ recoveryMessage: "Прямая отмена доступна только для забронированного заказа." });
      return;
    }
    update({ busy: true, recoveryMessage: "" });
    try {
      await mutation.mutateAsync({ orderId: order.orderId, ...params });
      if (scope.isCurrent()) complete(onOperationSuccess);
    } catch (error) {
      // Ошибка показана уведомлением; caller сохраняет ввод для повтора.
      if (!scope.isCurrent()) return;
      if (isCurrent()) showNotification("Не удалось подтвердить отмену заказа. Проверяем результат.", "error");
      const rejected = error instanceof ApiError && !!error.statusCode && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 408;
      update({ recovery: rejected ? "rejected" : "unknown" });
      await readResult(onOperationSuccess);
    } finally {
      update({ busy: false });
    }
  };

  return {
    cancelOrder,
    isPending: state.busy,
    isAccepted: state.accepted,
    draft: state.draft,
    setDraft: draft => update({ draft: { ...getState().draft, ...draft } }),
    resetDraft: () => {
      const current = getState();
      if (!current.busy && current.recovery === "none") update({ draft: initialState.draft });
    },
    requiresCheck: state.recovery !== "none",
    recoveryMessage: state.recoveryMessage,
    checkResult,
  };
};
