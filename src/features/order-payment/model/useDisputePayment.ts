import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getDisputePaymentCase, hasDisputePaymentProof, orderApi, orderCasesApi, orderQueryKeys,
  type ListOrdersDto, type OrderCaseDetail, type OrderUserRole,
} from "@/entities/order";
import { imageApi } from "@/entities/image";
import { useProfileUser } from "@/entities/user";
import { usePrivateMutation, usePrivateScope } from "@/shared/lib/query";
import { transformToApiError } from "@/shared/lib/errorHandler";

interface DisputePaymentState {
  caseId: number | null;
  file: File | null;
  imageId: number | null;
  comment: string;
  busy: boolean;
  outcome: "draft" | "accepted" | "unknown" | "rejected";
  checked: boolean;
  message: string;
}
const initial: DisputePaymentState = {
  caseId: null, file: null, imageId: null, comment: "", busy: false,
  outcome: "draft", checked: false, message: "",
};

export function useDisputePayment(order: ListOrdersDto, cases: readonly OrderCaseDetail[], role: OrderUserRole, available: boolean) {
  const client = useQueryClient();
  const scope = usePrivateScope();
  const profile = useProfileUser();
  const userId = profile.data?.id ?? null;
  const orderId = order.orderId;
  const mounted = useRef(true);
  const latest = useRef({ available, userId, orderId, role, profileReady: profile.isSuccess });
  latest.current = { available, userId, orderId, role, profileReady: profile.isSuccess };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const key = scope.key(["disputePayment", orderId]);
  const { data: state } = useQuery({ queryKey: key, queryFn: () => initial, initialData: initial, enabled: false, staleTime: Infinity, gcTime: Infinity });
  const get = () => client.getQueryData<DisputePaymentState>(key) ?? initial;
  const current = () => scope.isCurrent() && latest.current.userId === userId;
  const canContinue = () => current() && mounted.current && latest.current.orderId === orderId &&
    latest.current.role === "customer" && latest.current.profileReady;
  const update = (patch: Partial<DisputePaymentState>) => {
    if (current()) client.setQueryData<DisputePaymentState>(key, previous => ({ ...(previous ?? initial), ...patch }));
  };
  const access = { userId, role, inOwnList: true };
  const target = available && profile.isSuccess ? getDisputePaymentCase(order, cases, access) : null;
  const mutation = usePrivateMutation({
    mutationFn: ({ orderId: targetOrderId, imageId, comment }: { orderId: number; imageId: number; comment: string }) =>
      orderApi.confirmPaymentByCustomer(targetOrderId, imageId, comment),
    retry: false,
    // Offline не должен откладывать запись до возврата сети после закрытия формы.
    networkMode: "always",
  });
  const listKey = scope.key(orderQueryKeys.customerOrders());
  const casesKey = scope.key(orderQueryKeys.cases(orderId));
  const read = async () => {
    await Promise.all([client.cancelQueries({ queryKey: listKey, exact: true }), client.cancelQueries({ queryKey: casesKey, exact: true })]);
    if (!current()) throw new Error("Сессия завершена");
    const [orders, freshCases] = await Promise.all([
      client.fetchQuery({ queryKey: listKey, staleTime: 0, retry: false, networkMode: "always", queryFn: ({ signal }) => orderApi.getCustomerOrders(signal) }),
      client.fetchQuery({ queryKey: casesKey, staleTime: 0, retry: false, networkMode: "always", queryFn: ({ signal }) => orderCasesApi.list(orderId, signal) }),
    ]);
    if (!current()) throw new Error("Сессия завершена");
    const freshOrder = Array.isArray(orders) ? orders.find(item => item.orderId === orderId) : undefined;
    if (!freshOrder || freshOrder.product.sellerId === userId || freshCases.some(detail =>
      (detail.orderCase?.orderId != null && detail.orderCase.orderId !== orderId) ||
      (detail.buyerId != null && detail.buyerId !== userId) ||
      (detail.sellerId != null && detail.sellerId !== freshOrder.product.sellerId) ||
      (detail.orderStatus != null && detail.orderStatus !== freshOrder.actualStatus))) throw new Error("Данные заказа и обращений не подтверждены");
    return { order: freshOrder, cases: freshCases };
  };
  const refreshImages = async () => {
    if (!current()) return;
    await client.invalidateQueries({ queryKey: scope.key(["orderImages", orderId]) });
  };
  const check = async () => {
    try {
      const snapshot = await read();
      if (!current()) return;
      const draft = get();
      if ((draft.outcome === "unknown" || draft.outcome === "accepted") && draft.caseId && draft.imageId &&
        hasDisputePaymentProof(snapshot.cases, draft.caseId, draft.imageId)) {
        update({ outcome: "accepted", checked: true, message: "Подтверждение добавлено к спору. Заказ и доказательства обновлены." });
      } else if (draft.outcome === "accepted") {
        update({ message: "Подтверждение принято сервером, но ещё не появилось в обращении. Повторите проверку; повторная отправка заблокирована." });
      } else if (draft.outcome === "unknown") {
        update({ message: "Результат отправки неизвестен. Подтверждение пока не найдено в обращении; повторная отправка заблокирована." });
      } else {
        const allowed = getDisputePaymentCase(snapshot.order, snapshot.cases, access)?.orderCase?.id === draft.caseId;
        update({ outcome: allowed ? "draft" : "rejected", message: allowed
          ? "Отправка отклонена. Данные обновлены; можно явно повторить с тем же файлом."
          : "Состояние спора изменилось. Приложение подтверждения недоступно; файл и комментарий сохранены." });
      }
    } catch {
      update({ message: get().outcome === "accepted"
        ? "Подтверждение принято. Не удалось обновить заказ или обращение; повторите проверку. Повторная отправка заблокирована."
        : "Не удалось проверить результат. Файл и комментарий сохранены; повторите проверку. Повторная отправка заблокирована." });
    } finally { await refreshImages(); }
  };
  const submit = async () => {
    const draft = get();
    if (!canContinue() || role !== "customer" || !latest.current.available ||
      draft.busy || draft.outcome !== "draft" || !draft.caseId || (!draft.file && !draft.imageId)) return;
    // Общий синхронный guard переживает remount и блокирует второй экземпляр формы.
    update({ busy: true, message: "" });
    let posting = false;
    try {
      const allowed = (snapshot: Awaited<ReturnType<typeof read>>) =>
        getDisputePaymentCase(snapshot.order, snapshot.cases, access)?.orderCase?.id === draft.caseId;
      if (!allowed(await read())) {
        update({ message: "Состояние спора изменилось. Приложение подтверждения недоступно." });
        return;
      }
      if (!canContinue()) return;
      if (!get().imageId && draft.file) {
        const [imageId] = await imageApi.saveOrderImage(draft.file, orderId, scope.signal);
        if (!current()) return;
        update({ imageId });
      }
      if (!canContinue()) return;
      // Во время upload администратор мог завершить исходный спор.
      if (!allowed(await read())) {
        update({ message: "После загрузки файла состояние спора изменилось. Отправка недоступна; загруженный файл сохранён." });
        return;
      }
      const imageId = get().imageId;
      if (!canContinue() || !imageId) return;
      posting = true;
      await mutation.mutateAsync({ orderId, imageId, comment: draft.comment.trim() });
      if (!current()) return;
      update({ outcome: "accepted" });
    } catch (error) {
      if (!current()) return;
      if (posting) {
        const api = transformToApiError(error);
        const rejected = !!api.statusCode && api.statusCode >= 400 && api.statusCode < 500 && api.statusCode !== 408;
        update({ outcome: rejected ? "rejected" : "unknown", message: rejected ? api.message : "Результат отправки неизвестен." });
      } else update({ message: "Не удалось прочитать данные или загрузить файл. Комментарий и загруженный файл сохранены." });
    } finally {
      try {
        if (posting && current()) {
          for (const queryKey of [listKey, casesKey, scope.key(orderQueryKeys.sellerOrders())]) {
            void client.invalidateQueries({ queryKey, exact: true, refetchType: "none" });
          }
          await check();
        }
      } finally { update({ busy: false }); }
    }
  };
  const editable = () => !get().busy && get().outcome === "draft";
  return {
    state, profile, canOpen: role === "customer" && (!!target || !!state.caseId),
    canSubmit: !!target && state.caseId === target.orderCase?.id && !state.busy && state.outcome === "draft",
    start: () => { if (!get().caseId && target?.orderCase?.id) update({ caseId: target.orderCase.id }); },
    setComment: (comment: string) => { if (editable()) update({ comment }); },
    setFile: (file: File | null) => { if (editable() && !get().imageId) update({ file }); },
    submit,
    checkResult: async () => {
      if (!current() || role !== "customer" || get().busy || get().outcome === "draft") return;
      update({ busy: true });
      try { await check(); } finally { update({ busy: false }); }
    },
  };
}
