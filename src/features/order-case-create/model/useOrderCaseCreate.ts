import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { imageApi } from "@/entities/image";
import { useProfileUser } from "@/entities/user";
import {
  getAvailableOrderCaseKinds, orderApi, orderCasesApi, orderQueryKeys, useCreateOrderCase,
  type ListOrdersDto, type OrderCaseKind, type OrderUserRole,
} from "@/entities/order";
import { usePrivateScope } from "@/shared/lib/query";
import { hasCreatedOrderCase, getOrderCaseFailure } from "./result";

interface Evidence { file: File; imageIds?: number[] }
interface CaseDraft {
  kind: OrderCaseKind | null;
  comment: string;
  files: Evidence[];
  busy: boolean;
  outcome: "draft" | "accepted" | "unknown" | "rejected";
  checked: boolean;
  baselineIds: number[];
  baselineKnown: boolean;
  message: string;
}
const initial: CaseDraft = { kind: null, comment: "", files: [], busy: false, outcome: "draft", checked: false, baselineIds: [], baselineKnown: true, message: "" };

export function useOrderCaseCreate(orderId: number, role: OrderUserRole, available: boolean) {
  const client = useQueryClient();
  const scope = usePrivateScope();
  const profile = useProfileUser();
  const userId = profile.data?.id ?? null;
  const mutation = useCreateOrderCase();
  const mounted = useRef(true);
  const latest = useRef({ available, userId, profileReady: profile.isSuccess });
  latest.current = { available, userId, profileReady: profile.isSuccess };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const key = scope.key(["orderCaseCreate", orderId]);
  const { data: state } = useQuery({ queryKey: key, queryFn: () => initial, initialData: initial, enabled: false, staleTime: Infinity, gcTime: Infinity });
  const get = () => client.getQueryData<CaseDraft>(key) ?? initial;
  const update = (patch: Partial<CaseDraft>) => {
    if (scope.isCurrent()) client.setQueryData<CaseDraft>(key, previous => ({ ...(previous ?? initial), ...patch }));
  };
  const listKey = scope.key(role === "customer" ? orderQueryKeys.customerOrders() : orderQueryKeys.sellerOrders());
  const casesKey = scope.key(orderQueryKeys.cases(orderId));
  const access = { userId, role, inOwnList: true };
  const current = () => scope.isCurrent() && latest.current.userId === userId;
  const read = async () => {
    // Прежний GET и staleTime не подтверждают возможность записи или её результат.
    await Promise.all([client.cancelQueries({ queryKey: listKey, exact: true }), client.cancelQueries({ queryKey: casesKey, exact: true })]);
    if (!current()) throw new Error("Сессия завершена");
    const [orders, cases] = await Promise.all([
      client.fetchQuery({ queryKey: listKey, staleTime: 0, retry: false, queryFn: ({ signal }) => role === "customer" ? orderApi.getCustomerOrders(signal) : orderApi.getSellerOrders(signal) }),
      client.fetchQuery({ queryKey: casesKey, staleTime: 0, retry: false, queryFn: ({ signal }) => orderCasesApi.list(orderId, signal) }),
    ]);
    if (!current()) throw new Error("Сессия завершена");
    const order = Array.isArray(orders) ? orders.find((item: ListOrdersDto) => item.orderId === orderId) : undefined;
    if (!order) throw new Error("Заказ отсутствует в актуальном списке вашей роли.");
    if (cases.some(detail => (detail.sellerId != null && detail.sellerId !== order.product.sellerId) ||
      (detail.buyerId != null && detail.buyerId !== (role === "customer" ? userId : order.userInfo.id)))) {
      throw new Error("Участники заказа и обращений расходятся.");
    }
    if (cases.some(detail => detail.orderStatus != null && detail.orderStatus !== order.actualStatus)) throw new Error("Статусы заказа и обращений расходятся. Повторите чтение.");
    return { order, cases };
  };
  const check = async () => {
    try {
      const { order, cases } = await read();
      if (!current()) return;
      const draft = get();
      const found = draft.baselineKnown && !!draft.kind && !!userId && hasCreatedOrderCase(cases, draft.baselineIds, draft.kind, draft.comment, userId);
      if ((draft.outcome === "accepted" || draft.outcome === "unknown") && found) {
        update({ outcome: "accepted", checked: true, message: "Обращение создано. Заказ и история обновлены." });
      } else if (draft.outcome === "accepted") {
        update({ message: "Обращение принято сервером, но ещё не подтверждено в истории. Повторите чтение; повторное создание заблокировано." });
      } else if (draft.outcome === "unknown") {
        update({ message: "Результат отправки не подтверждён. Повторная отправка заблокирована; проверьте результат позже." });
      } else {
        const allowed = draft.kind && getAvailableOrderCaseKinds(order, cases, access).includes(draft.kind);
        update({ outcome: "draft", message: `${draft.message} Данные обновлены.${allowed ? " Можно повторить отправку явно." : " Создание этого обращения сейчас недоступно."}` });
      }
    } catch {
      update({ message: get().outcome === "accepted"
        ? "Обращение принято. Не удалось обновить заказ или историю. Повторите чтение; повторное создание заблокировано."
        : "Не удалось проверить результат. Повторите чтение; комментарий и загруженные файлы сохранены." });
    }
  };
  const submit = async (comment: string) => {
    const draft = get();
    if (!current() || !mounted.current || !latest.current.available || !latest.current.profileReady || draft.busy || draft.outcome !== "draft" || !draft.kind || !comment.trim()) return;
    update({ busy: true, comment: comment.trim(), message: "" });
    let posting = false;
    try {
      let snapshot = await read();
      if (!current() || !mounted.current || !latest.current.profileReady) return;
      if (!getAvailableOrderCaseKinds(snapshot.order, snapshot.cases, access).includes(draft.kind)) {
        update({ message: "Действие больше недоступно. Заказ и история обновлены; проверьте статус и открытые обращения." });
        return;
      }
      const evidence = draft.kind === "CANCELLATION_REQUEST" ? [] : draft.files;
      for (let index = 0; index < evidence.length; index++) {
        if (get().files[index].imageIds) continue;
        const imageIds = await imageApi.saveOrderImage(evidence[index].file, orderId, scope.signal);
        if (!current()) return;
        update({ files: get().files.map((file, i) => i === index ? { ...file, imageIds } : file) });
        if (!mounted.current) return;
      }
      if (evidence.length) snapshot = await read();
      if (!current() || !mounted.current || !latest.current.profileReady) return;
      if (!getAvailableOrderCaseKinds(snapshot.order, snapshot.cases, access).includes(draft.kind)) {
        update({ message: "После загрузки файлов состояние заказа изменилось. Создание обращения недоступно; файлы сохранены в заказе." });
        return;
      }
      update({
        baselineIds: snapshot.cases.flatMap(detail => detail.orderCase?.id != null ? [detail.orderCase.id] : []),
        baselineKnown: snapshot.cases.every(detail => typeof detail.orderCase?.id === "number" && Number.isSafeInteger(detail.orderCase.id) && detail.orderCase.id > 0),
      });
      posting = true;
      const common = { orderId, comment: comment.trim() };
      await mutation.mutateAsync(draft.kind === "CANCELLATION_REQUEST" ? { ...common, kind: draft.kind } : {
        ...common, kind: draft.kind, imageIds: get().files.flatMap(file => file.imageIds ?? []),
      });
      if (!current()) return;
      update({ outcome: "accepted", message: "Обращение принято. Обновляем заказ и историю." });
      await check();
    } catch (error) {
      if (!current()) return;
      if (posting) {
        update(getOrderCaseFailure(error));
        await check();
      } else update({ message: "Не удалось прочитать заказ или загрузить файлы. Комментарий и загруженные файлы сохранены; повторите попытку." });
    } finally { update({ busy: false }); }
  };
  return {
    state, userId, profile, submit,
    select: (kind: OrderCaseKind) => {
      const draft = get();
      if (!draft.busy && draft.outcome === "draft") update({ kind, message: "" });
    },
    setComment: (comment: string) => { if (!get().busy && get().outcome === "draft") update({ comment }); },
    addFiles: (files: File[]) => { if (!get().busy && get().outcome === "draft" && get().kind !== "CANCELLATION_REQUEST") update({ files: [...get().files, ...files.map(file => ({ file }))] }); },
    removeFile: (index: number) => { if (!get().busy && get().outcome === "draft" && !get().files[index]?.imageIds) update({ files: get().files.filter((_, i) => i !== index) }); },
    finish: () => { if (!get().busy && get().outcome === "accepted" && get().checked) update(initial); },
    checkResult: async () => {
      if (!current() || get().busy || get().outcome === "draft") return;
      update({ busy: true });
      try { await check(); } finally { update({ busy: false }); }
    },
  };
}
