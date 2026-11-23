import { useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  adminOrderCaseKeys, adminOrderCasesApi, adminOrderKeys, casesAllowDelivery, hasAdminOrderCaseAccess,
  hasAgentId, hasTermsVersion, invalidateDeliveryReads, knownOpenAdminCase, orderQueryKeys, orderTermsApi,
  readDeliveryCases, readDeliveryOrder, type AdminOrderFilter, type AdminOrderDto,
  type DeliveryTermsRequest, type OrderCaseDetail, type TermsOrder,
} from "@/entities/order";
import { usePrivateScope } from "@/shared/lib/query";
import { allowsDeliveryCost, deliveryAttemptState, deliveryBlock, deliveryFailure, deliveryFingerprint, type Attempt } from "./deliveryTermsAttempt";

export interface EditorProps {
  order: TermsOrder;
  context: { role: "seller" } | { role: "admin"; agentId: number; filter: AdminOrderFilter };
  available: boolean;
}
const openCase = "По заказу открыто обращение или статус обращения не подтверждён";

export function useDeliveryTermsEditor({ order, context, available }: EditorProps) {
  const client = useQueryClient();
  const scope = usePrivateScope();
  const { orderId } = order;
  const admin = context.role === "admin" ? context : undefined;
  const agentId = admin?.agentId;
  const attemptState = useMemo(() => deliveryAttemptState(client, scope, orderId, context), [client, scope, orderId, context]);
  const mounted = useRef(false);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, [scope, agentId, orderId]);
  const { read, write, subscribe } = attemptState;
  const state = useSyncExternalStore(subscribe, read, read);
  const current = () => scope.isCurrent() && (!admin || (hasAgentId(admin.agentId) && hasAdminOrderCaseAccess(client, scope.id)));
  const cache = client.getQueryCache();
  const cachedCase = () => admin ? knownOpenAdminCase(client, scope.id, admin.agentId, orderId) : undefined;
  const knownCaseId = useSyncExternalStore(cache.subscribe.bind(cache), cachedCase, () => undefined);
  const listKey = admin ? adminOrderKeys.list(scope.id, admin.filter) : scope.key(orderQueryKeys.sellerOrders());
  const matchesDisplayed = (baseline: TermsOrder) => {
    const list = client.getQueryState<(TermsOrder & Partial<Pick<AdminOrderDto, "sellerId">>)[]>(listKey);
    const cached = list?.data?.find(row => row.orderId === orderId && (!admin || row.sellerId === agentId));
    return list?.status === "success" && !!cached && deliveryFingerprint(cached) === deliveryFingerprint(baseline);
  };
  const freshOrder = () => readDeliveryOrder(client, scope, orderId, admin);
  const sync = async (outdatedVersion?: number) => {
    // У истории и пользовательских списков свои loading/error/retry. Они не задерживают контрольный GET заказа.
    void invalidateDeliveryReads(client, scope, orderId, context, outdatedVersion);
    if (!current()) throw new Error("Доступ изменился");
    const fresh = await freshOrder();
    if (outdatedVersion !== undefined && hasTermsVersion(fresh?.termsVersion) && fresh.termsVersion - 1 > outdatedVersion) {
      // Между PUT и контрольным GET условия могли измениться ещё раз.
      void invalidateDeliveryReads(client, scope, orderId, context, fresh.termsVersion - 1);
    }
    return fresh;
  };
  const casesKey = scope.key(orderQueryKeys.cases(orderId));
  const checkCases = async () => {
    if (!admin) {
      const cases = await readDeliveryCases(client, scope, orderId);
      if (!casesAllowDelivery(cases, orderId)) throw new Error(openCase);
    } else {
      const caseId = cachedCase();
      if (caseId) {
        const detail = await client.fetchQuery({ queryKey: adminOrderCaseKeys.detail(scope.id, caseId), retry: false, staleTime: 0,
          queryFn: ({ signal }) => adminOrderCasesApi.detail(caseId, signal) });
        if (detail.orderCase?.orderId !== orderId || detail.orderCase.state !== "RESOLVED" || cachedCase()) throw new Error(openCase);
      }
    }
  };
  const reconcile = async (attempt: Attempt) => {
    try {
      const fresh = await sync(attempt.phase === "accepted" || attempt.phase === "stale" ? attempt.version : undefined);
      if (!fresh) throw new Error("Заказ отсутствует в актуальной выборке");
      if (attempt.phase === "blocked" || attempt.phase === "stale") await checkCases();
      const advanced = hasTermsVersion(fresh.termsVersion) && fresh.termsVersion > attempt.version;
      if (attempt.phase === "blocked" || advanced) {
        const message = attempt.phase === "accepted" ? "Условия доставки обновлены" :
          attempt.phase === "unknown" ? "Получена новая версия. Проверьте актуальные условия." :
          attempt.phase === "blocked" ? "Заказ перечитан. Проверьте актуальные условия." : attempt.message;
        write({ ...attempt, phase: "idle", busy: false, message });
        return true;
      } else {
        write({ ...attempt, busy: false });
      }
    } catch (error) {
      write({ ...attempt, busy: false, readError: error instanceof Error ? error.message : "Не удалось обновить заказ" });
    }
  };
  const check = async () => {
    if (!current() || read()?.busy) return;
    const previous: Attempt = { phase: "blocked", version: order.termsVersion ?? -1, message: "", busy: false, ...read(), readError: undefined };
    write({ ...previous, busy: true });
    await reconcile(previous.phase === "idle" ? { ...previous, phase: "blocked" } : previous);
  };
  const submit = async (baseline: TermsOrder, body: DeliveryTermsRequest) => {
    const previous = read();
    if (!available || !current() || previous?.busy || (previous && previous.phase !== "idle")) return;
    const attempt: Attempt = { phase: "pending", version: body.expectedVersion, message: "", busy: true };
    write(attempt);
    let dispatched = false;
    try {
      if (!matchesDisplayed(baseline)) throw new Error("Условия изменились. Черновик сохранён.");
      await checkCases();
      if (!mounted.current || !current()) throw new Error("Редактирование закрыто");
      const fresh = await freshOrder();
      if (!mounted.current || !current()) throw new Error("Редактирование закрыто");
      if (!fresh || deliveryFingerprint(fresh) !== deliveryFingerprint(baseline)) throw new Error("Условия изменились. Черновик сохранён.");
      const blocked = deliveryBlock(fresh);
      if (blocked) throw new Error(blocked);
      if (!allowsDeliveryCost(fresh, body.deliveryAmount === null)) throw new Error("Укажите стоимость доставки с учётом подтверждённой оплаты");
      if (!matchesDisplayed(baseline)) throw new Error("Обновите условия заказа");
      if (admin ? cachedCase() : !casesAllowDelivery(client.getQueryData<OrderCaseDetail[]>(casesKey), orderId)) throw new Error(openCase);
      dispatched = true;
      await orderTermsApi.update(context, orderId, body, scope.signal);
    } catch (error) {
      if (!scope.isCurrent()) return;
      const result = dispatched ? deliveryFailure(error) : { phase: "idle" as const, message: error instanceof Error ? error.message : "Не удалось проверить заказ" };
      const next = { ...attempt, ...result, busy: false };
      if (dispatched && current()) {
        write({ ...next, busy: true });
        if (next.phase === "stale" || next.phase === "unknown") await reconcile(next);
        else {
          try {
            if (admin && next.phase === "blocked") await client.invalidateQueries({ queryKey: ["admin", scope.id, "access"], exact: true });
            if (current()) await sync();
            if (current()) await checkCases();
          }
          catch { /* Блокировка и исходная причина сохраняются. */ }
          write(next);
        }
      } else write(next);
      return;
    }
    const accepted: Attempt = { ...attempt, phase: "accepted", message: "Изменение принято. Ожидаем актуальные условия." };
    write(accepted);
    return await reconcile(accepted) && mounted.current && current();
  };
  return { state, check, submit, knownCaseId };
}
