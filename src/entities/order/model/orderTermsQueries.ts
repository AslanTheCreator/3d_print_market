import { getOrderPaymentBreakdown } from "../lib/orderPaymentBreakdown";
import type { QueryClient } from "@tanstack/react-query";
import type { PrivateScope } from "@/shared/lib/query";
import { orderApi } from "../api/orderApi";
import { adminOrderApi } from "../api/adminOrderApi";
import { orderCasesApi } from "../api/orderCasesApi";
import { hasAdminOrderCaseAccess } from "./adminOrderCaseQueries";
import { orderQueryKeys } from "./queryKeys";
import { adminOrderKeys } from "./adminQueries";
import type { AdminOrderDto, AdminOrderFilter } from "./admin";
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

// GET одного заказа в административном API v1.39 отсутствует.
export async function readAdminOrderPage(client: QueryClient, session: number | null, agentId: number, orderId: number,
  filter: AdminOrderFilter, current: () => boolean) {
  const queryKey = adminOrderKeys.list(session, filter);
  await client.cancelQueries({ queryKey, exact: true });
  if (!current()) throw new Error("Доступ к заказу изменился");
  const rows = await client.fetchQuery({ queryKey, staleTime: 0, retry: false, networkMode: "always",
    queryFn: ({ signal }) => adminOrderApi.list(filter, signal) });
  if (!current()) throw new Error("Доступ к заказу изменился");
  return rows.find(row => row.orderId === orderId && row.sellerId === agentId);
}

// Прерываем чтение, начатое до подтверждения операции: его ответ не является контрольным.
export function readDeliveryOrder(client: QueryClient, scope: PrivateScope, orderId: number): Promise<ListOrdersDto | null>;
export function readDeliveryOrder(client: QueryClient, scope: PrivateScope, orderId: number, admin?: { agentId: number; filter: AdminOrderFilter }): Promise<ListOrdersDto | AdminOrderDto | null>;
export async function readDeliveryOrder(client: QueryClient, scope: PrivateScope, orderId: number, admin?: { agentId: number; filter: AdminOrderFilter }) {
  const requireScope = () => {
    if (!scope.isCurrent() || (admin && (!hasAgentId(admin.agentId) || !hasAdminOrderCaseAccess(client, scope.id)))) throw new Error("Доступ к заказу изменился");
  };
  requireScope();
  if (admin) {
    const row = await readAdminOrderPage(client, scope.id, admin.agentId, orderId, admin.filter,
      () => scope.isCurrent() && hasAdminOrderCaseAccess(client, scope.id))
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
function changedVersionKey(scope: PrivateScope, orderId: number, agentId?: number) {
  return scope.key(["deliveryChangedVersion", ...(agentId === undefined ? [] : [agentId]), orderId]);
}

type ReviewedOrder = Pick<ListOrdersDto, "orderId" | "termsVersion" | "actualStatus" | "paymentProofImageId" | "calculation"> & { sellerId?: number; product: { sellerId: number } };
type ReviewedCalculation = Pick<ReviewedOrder, "actualStatus" | "paymentProofImageId"> & { version: number; calculation: string };

export function rememberReviewedCalculation(client: QueryClient, scope: PrivateScope, order: ReviewedOrder) {
  if (!scope.isCurrent() || !hasTermsVersion(order.termsVersion)) return;
  const key = scope.key(["reviewedOrderCalculation", order.sellerId ?? order.product.sellerId, order.orderId]);
  client.getQueryCache().build(client, { queryKey: key, gcTime: Infinity });
  client.setQueryData<ReviewedCalculation>(key, {
    version: order.termsVersion, calculation: getOrderPaymentBreakdown(order).fingerprint,
    actualStatus: order.actualStatus, paymentProofImageId: order.paymentProofImageId,
  });
}

export function hasCurrentDeliveryVersion(client: QueryClient, scope: PrivateScope, order: ReviewedOrder) {
  const reviewed = client.getQueryData<ReviewedCalculation>(scope.key(["reviewedOrderCalculation", order.sellerId ?? order.product.sellerId, order.orderId]));
  if (reviewed) {
    if (!hasTermsVersion(order.termsVersion) || order.termsVersion < reviewed.version) return false;
    if (order.termsVersion === reviewed.version) {
      if (getOrderPaymentBreakdown(order).fingerprint !== reviewed.calculation) return false;
      if (order.actualStatus.startsWith("AWAITING_") && (order.actualStatus !== reviewed.actualStatus ||
          order.paymentProofImageId !== reviewed.paymentProofImageId)) return false;
    }
  }
  const outdated = client.getQueryData<number>(changedVersionKey(scope, order.orderId));
  const agentVersion = client.getQueryData<number>(changedVersionKey(scope, order.orderId, order.sellerId ?? order.product.sellerId));
  const floor = Math.max(outdated ?? -1, agentVersion ?? -1);
  return floor < 0 || (hasTermsVersion(order.termsVersion) && order.termsVersion > floor);
}

export async function invalidateDeliveryReads(client: QueryClient, scope: PrivateScope, orderId: number, context: DeliveryTermsContext, outdatedVersion?: number) {
  if (!scope.isCurrent()) return;
  if (outdatedVersion !== undefined) {
    const key = changedVersionKey(scope, orderId, context.role === "admin" ? context.agentId : undefined);
    // Нижняя граница версий нужна до конца сессии, в том числе при позднем GET из другой выдачи.
    client.getQueryCache().build(client, { queryKey: key, gcTime: Infinity });
    client.setQueryData<number>(key, previous => Math.max(previous ?? outdatedVersion, outdatedVersion));
  }
  const refreshHistory = async (queryKey: readonly unknown[]) => {
    const exact = { queryKey, exact: true };
    await client.cancelQueries(exact);
    if (scope.isCurrent()) await client.invalidateQueries(exact);
  };
  const affected = (order: ListOrdersDto) => order.orderId === orderId &&
    (context.role !== "admin" || order.product.sellerId === context.agentId);
  const refreshParticipantList = async (queryKey: readonly unknown[]) => {
    const exact = { queryKey, exact: true };
    await client.cancelQueries(exact);
    if (!scope.isCurrent()) return;
    // Сохраняем остальные строки и открытые диалоги. Для изменённого заказа нужен новый расчёт.
    if (client.getQueryData<ListOrdersDto[]>(queryKey)?.some(order => affected(order) && order.calculation)) {
      client.setQueryData<ListOrdersDto[]>(queryKey, rows => rows?.map(order =>
        affected(order) ? { ...order, calculation: null } : order));
    }
    await client.invalidateQueries(exact);
  };
  async function refreshAdminLists() {
    const queryKey = adminOrderKeys.all(scope.id);
    if (context.role !== "admin") return;
    const related = (query: { queryKey: readonly unknown[] }) => {
      const filter = query.queryKey[3] as AdminOrderFilter | "located" | undefined;
      if (filter === "located") return query.queryKey[4] === context.agentId && query.queryKey[5] === orderId;
      return !!filter && (filter.agentId === undefined || filter.agentId === context.agentId);
    };
    await client.invalidateQueries({ queryKey, predicate: related, refetchType: "none" });
    if (!scope.isCurrent() || !hasAdminOrderCaseAccess(client, scope.id)) return;
    const lists = { queryKey, type: "active" as const, predicate: (query: { queryKey: readonly unknown[] }) => related(query) && typeof query.queryKey[3] === "object" };
    await client.cancelQueries(lists);
    if (scope.isCurrent() && hasAdminOrderCaseAccess(client, scope.id)) await client.refetchQueries(lists);
  }
  const reads = [
    refreshHistory(scope.key(orderQueryKeys.termsHistory(orderId))),
    refreshParticipantList(scope.key(orderQueryKeys.customerOrders())),
  ];
  if (context.role === "admin") {
    reads.push(
      refreshHistory(adminOrderKeys.history(scope.id, context.agentId, orderId)),
      refreshParticipantList(scope.key(orderQueryKeys.sellerOrders())),
      refreshAdminLists(),
    );
  }
  await Promise.all(reads);
}
