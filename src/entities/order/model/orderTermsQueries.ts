import type { QueryClient } from "@tanstack/react-query";
import type { PrivateScope } from "@/shared/lib/query";
import { orderApi } from "../api/orderApi";
import { adminOrderApi } from "../api/adminOrderApi";
import { orderCasesApi } from "../api/orderCasesApi";
import { hasAdminOrderCaseAccess } from "./adminOrderCaseQueries";
import { orderQueryKeys } from "./queryKeys";
import { adminOrderKeys } from "./adminQueries";
import type { AdminOrderFilter } from "./admin";
import type { ListOrdersDto } from "./types";
import { hasAgentId, hasTermsVersion, type DeliveryTermsContext, type TermsOrder } from "./orderTerms";
import type { OrderCaseDetail, OrderCaseSummary } from "./orderCase";

export function knownOpenAdminCase(client: QueryClient, session: number | null, agentId: number, orderId: number) {
  const states = new Map<number, { time: number; open: boolean }>();
  function observe(id: number | null | undefined, state: unknown, time: number) {
    if (!id || (state !== "OPEN" && state !== "RESOLVED")) return;
    if ((states.get(id)?.time ?? -1) <= time) states.set(id, { time, open: state === "OPEN" });
  }
  for (const query of client.getQueryCache().findAll({ queryKey: ["admin", session, "order-cases"] })) {
    const { data, dataUpdatedAt, status, isInvalidated } = query.state;
    if (isInvalidated || status !== "success") continue;
    if (query.queryKey[3] === "list" && Array.isArray(data)) {
      for (const entry of data as OrderCaseSummary[]) {
        if (entry.orderId === orderId) observe(entry.caseId, entry.state, dataUpdatedAt);
      }
    } else if (query.queryKey[3] === "detail") {
      const detail = data as OrderCaseDetail | undefined;
      if (detail?.orderCase?.orderId === orderId && (detail.sellerId == null || detail.sellerId === agentId)) {
        observe(detail.orderCase.id, detail.orderCase.state, dataUpdatedAt);
      }
    }
  }
  return [...states].find(([, state]) => state.open)?.[0];
}

export function casesAllowDelivery(cases: OrderCaseDetail[] | undefined, orderId: number) {
  return Array.isArray(cases) && cases.every(detail => detail?.orderCase?.orderId === orderId && detail.orderCase.state === "RESOLVED");
}

// Прерываем чтение, начатое до подтверждения операции: его ответ не является контрольным.
export async function readDeliveryOrder(client: QueryClient, scope: PrivateScope, orderId: number, admin?: { agentId: number; filter: AdminOrderFilter }) {
  const requireScope = () => {
    if (!scope.isCurrent() || (admin && (!hasAgentId(admin.agentId) || !hasAdminOrderCaseAccess(client, scope.id)))) throw new Error("Доступ к заказу изменился");
  };
  requireScope();
  if (admin) {
    const key = adminOrderKeys.list(scope.id, admin.filter);
    await client.cancelQueries({ queryKey: key, exact: true });
    requireScope();
    const rows = await client.fetchQuery({ queryKey: key, staleTime: 0, retry: false, networkMode: "always",
      queryFn: ({ signal }) => adminOrderApi.list(admin.filter, signal) });
    requireScope();
    const row = rows.find(item => item.sellerId === admin.agentId && item.orderId === orderId)
      ?? await client.fetchQuery({ queryKey: adminOrderKeys.located(scope.id, admin.agentId, orderId), staleTime: 0,
        retry: false, networkMode: "always", queryFn: ({ signal }) => adminOrderApi.find(admin.agentId, orderId, signal) });
    requireScope();
    return row?.sellerId === admin.agentId ? row : null;
  }
  const key = scope.key(orderQueryKeys.sellerOrders());
  await client.cancelQueries({ queryKey: key, exact: true });
  requireScope();
  const rows = await client.fetchQuery({ queryKey: key, staleTime: 0, retry: false, networkMode: "always",
    queryFn: ({ signal }) => orderApi.getSellerOrders(signal) });
  requireScope();
  return rows.find(item => item.orderId === orderId) ?? null;
}

export async function readDeliveryCases(client: QueryClient, scope: PrivateScope, orderId: number) {
  const queryKey = scope.key(orderQueryKeys.cases(orderId));
  await client.cancelQueries({ queryKey, exact: true });
  if (!scope.isCurrent()) throw new Error("Сессия изменилась");
  return client.fetchQuery({ queryKey, staleTime: 0, retry: false, networkMode: "always",
    queryFn: ({ signal }) => orderCasesApi.list(orderId, signal) });
}

// Запоминаем только версии, устаревание которых уже подтвердил сервер в этой сессии.
function changedVersionKey(scope: PrivateScope, orderId: number) {
  return scope.key(["deliveryChangedVersion", orderId]);
}

export function hasCurrentDeliveryVersion(client: QueryClient, scope: PrivateScope, order: Pick<TermsOrder, "orderId" | "termsVersion">) {
  const outdated = client.getQueryData<number>(changedVersionKey(scope, order.orderId));
  return outdated === undefined || (hasTermsVersion(order.termsVersion) && order.termsVersion > outdated);
}

export async function invalidateDeliveryReads(client: QueryClient, scope: PrivateScope, orderId: number, context: DeliveryTermsContext, outdatedVersion?: number) {
  if (!scope.isCurrent()) return;
  if (outdatedVersion !== undefined) {
    const key = changedVersionKey(scope, orderId);
    // Нижняя граница версий нужна до конца сессии, в том числе при позднем GET из другой выдачи.
    client.getQueryCache().build(client, { queryKey: key, gcTime: Infinity });
    client.setQueryData<number>(key, previous => Math.max(previous ?? outdatedVersion, outdatedVersion));
  }
  const refreshHistory = async (queryKey: readonly unknown[]) => {
    const exact = { queryKey, exact: true };
    await client.cancelQueries(exact);
    if (scope.isCurrent()) await client.invalidateQueries(exact);
  };
  const refreshParticipantList = async (queryKey: readonly unknown[]) => {
    const exact = { queryKey, exact: true };
    await client.cancelQueries(exact);
    if (!scope.isCurrent()) return;
    // Сохраняем остальные строки и открытые диалоги. Для изменённого заказа нужен новый расчёт.
    if (client.getQueryData<ListOrdersDto[]>(queryKey)?.some(order => order.orderId === orderId && order.calculation)) {
      client.setQueryData<ListOrdersDto[]>(queryKey, rows => rows?.map(order =>
        order.orderId === orderId ? { ...order, calculation: null } : order));
    }
    await client.invalidateQueries(exact);
  };
  const reads = [
    refreshHistory(scope.key(orderQueryKeys.termsHistory(orderId))),
    refreshParticipantList(scope.key(orderQueryKeys.customerOrders())),
  ];
  if (context.role === "admin") {
    reads.push(
      refreshHistory(adminOrderKeys.history(scope.id, context.agentId, orderId)),
      refreshParticipantList(scope.key(orderQueryKeys.sellerOrders())),
      client.invalidateQueries({ queryKey: adminOrderKeys.all(scope.id), refetchType: "none" }),
    );
  }
  await Promise.all(reads);
}
