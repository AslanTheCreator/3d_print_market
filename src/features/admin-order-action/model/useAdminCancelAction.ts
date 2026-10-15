import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminOrderApi, getAdminOrderActionFlags, type AdminOrderDto } from "@/entities/order";
import type { UserProfileModel } from "@/entities/user";
import { ApiError } from "@/shared/lib/errorHandler";
import { usePrivateScope } from "@/shared/lib/query";

interface CancelState {
  busy: boolean;
  unknown: boolean;
  accepted: boolean;
  reconciled: boolean;
  comment: string;
  error: unknown;
  recoveryMessage: string;
}

const initialState: CancelState = {
  busy: false, unknown: false, accepted: false, reconciled: false,
  comment: "", error: undefined, recoveryMessage: "",
};

export function useAdminCancelAction({ order, session, changed }: {
  order: AdminOrderDto; session: number | null; changed: () => Promise<void>;
}) {
  const scope = usePrivateScope();
  const client = useQueryClient();
  const currentOrder = useRef(order);
  currentOrder.current = order;
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  // Как у пользовательской отмены, guard принадлежит scope, а не экземпляру формы.
  const key = scope.key(["adminOrderCancel", order.sellerId, order.orderId]);
  const { data: state } = useQuery({
    queryKey: key, queryFn: () => initialState, initialData: initialState,
    enabled: false, staleTime: Infinity, gcTime: Infinity,
  });
  const getState = () => client.getQueryData<CancelState>(key) ?? initialState;
  const update = (patch: Partial<CancelState>) => {
    if (scope.isCurrent()) client.setQueryData<CancelState>(key, previous => ({ ...(previous ?? initialState), ...patch }));
  };
  const isCurrent = () => mounted.current && scope.isCurrent() &&
    currentOrder.current.orderId === order.orderId && currentOrder.current.sellerId === order.sellerId;
  const hasAccess = () => {
    const access = client.getQueryState<UserProfileModel>(["admin", session, "access"]);
    return scope.isCurrent() && access?.status === "success" && access.data?.role === "ADMIN";
  };
  const refresh = async () => {
    if (!isCurrent() || !hasAccess()) return false;
    await changed();
    return isCurrent() && hasAccess();
  };
  const readResult = async () => {
    if (!hasAccess()) return false;
    try {
      const current = await adminOrderApi.find(order.sellerId, order.orderId, scope.signal);
      if (!scope.isCurrent()) return false;
      if (!current || current.sellerId !== order.sellerId || current.actualStatus === "BOOKED") {
        update({ recoveryMessage: "Изменение статуса не подтверждено. Повтор действия заблокирован; проверьте результат позже." });
        return false;
      }
      update({ unknown: false, accepted: true, reconciled: true, error: undefined, recoveryMessage: "" });
      return await refresh();
    } catch (error) {
      update({ error, recoveryMessage: "Не удалось проверить результат отмены. Повторная отправка заблокирована." });
      return false;
    }
  };

  const submit = async (comment: string) => {
    const current = getState();
    if (current.busy || current.unknown || current.accepted || !isCurrent() || !hasAccess()) return false;
    if (!getAdminOrderActionFlags(currentOrder.current.actualStatus).canCancel) {
      update({ error: new Error("Статус заказа изменился. Действие недоступно.") });
      return false;
    }
    update({ busy: true, comment, error: undefined, recoveryMessage: "" });
    let attempted = false;
    let written = false;
    try {
      const fresh = await adminOrderApi.find(order.sellerId, order.orderId, scope.signal);
      if (!isCurrent()) return false;
      if (!hasAccess()) {
        update({ error: new Error("Доступ администратора не подтверждён. Повторите проверку доступа.") });
        return false;
      }
      if (!fresh || fresh.sellerId !== order.sellerId || !getAdminOrderActionFlags(fresh.actualStatus).canCancel || !getAdminOrderActionFlags(currentOrder.current.actualStatus).canCancel) {
        update({ error: new Error("Статус или владелец заказа изменился. Отмена недоступна; обновите список.") });
        return false;
      }
      attempted = true;
      await adminOrderApi.act(order.sellerId, order.orderId, "CANCEL", { comment: comment || undefined });
      written = true;
      update({ accepted: true, unknown: false, error: undefined });
      return await refresh();
    } catch (error) {
      if (!scope.isCurrent()) return false;
      update({ error });
      if (!attempted || written) return false;
      const rejected = error instanceof ApiError && !!error.statusCode && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 408;
      if (rejected) {
        // Ошибка чтения отображается родительским списком; введённые данные сохраняются.
        if (isCurrent() && hasAccess()) await changed().catch(() => undefined);
        return false;
      }
      update({ unknown: true });
      return isCurrent() ? await readResult() : false;
    } finally { update({ busy: false }); }
  };

  const checkResult = async () => {
    const current = getState();
    if (current.busy || (!current.unknown && !current.accepted) || !isCurrent() || !hasAccess()) return false;
    update({ busy: true, error: undefined });
    try { return current.accepted ? await refresh() : await readResult(); }
    catch (error) { update({ error }); return false; }
    finally { update({ busy: false }); }
  };

  return { ...state, submit, checkResult };
}
