import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { useOrderCasesQuery, type ListOrdersDto, type ListOrdersModel, type OrderStatus } from "@/entities/order";
import { usePrivateScope } from "@/shared/lib/query";

interface SyncIssue { orderId: number; statuses: OrderStatus[]; error?: unknown }

export function useOrderCaseHistory(order: ListOrdersModel | null, orders: UseQueryResult<ListOrdersDto[]>) {
  const scope = usePrivateScope();
  const history = useOrderCasesQuery(order?.orderId ?? null);
  const [issue, setIssue] = useState<SyncIssue | null>(null);
  const [syncing, setSyncing] = useState(false);
  const attempted = useRef("");
  const revision = useRef(0);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const statuses = useMemo(() => [...new Set((history.data ?? []).flatMap(detail => detail.orderStatus ? [detail.orderStatus] : []))], [history.data]);
  const mismatch = !!order && statuses.some(status => status !== order.actualStatus);
  const { refetch } = orders;
  const refresh = useCallback(async (expected: SyncIssue | null) => {
    if (!scope.isCurrent()) return;
    const run = ++revision.current;
    setSyncing(true);
    if (expected) setIssue(expected);
    try {
      const result = await refetch();
      if (!mounted.current || !scope.isCurrent() || run !== revision.current) return;
      const fresh = result.data?.find(item => item.orderId === expected?.orderId);
      if (result.error) throw result.error;
      if (expected && (!fresh || expected.statuses.some(status => status !== fresh.actualStatus))) {
        throw new Error("Статусы заказа и обращений расходятся. Повторите обновление или откройте детали заново.");
      }
      setIssue(null);
    } catch (error) {
      if (mounted.current && scope.isCurrent() && run === revision.current && expected) setIssue({ ...expected, error });
    } finally {
      if (mounted.current && scope.isCurrent() && run === revision.current) setSyncing(false);
    }
  }, [refetch, scope]);

  const token = order ? `${scope.id}:${order.orderId}:${history.dataUpdatedAt}` : "";
  useEffect(() => {
    if (!order || !history.isSuccess || history.isFetching) return;
    if (mismatch && attempted.current !== token) {
      attempted.current = token;
      void refresh({ orderId: order.orderId, statuses });
    } else if (!mismatch && statuses.length > 0 && issue?.orderId === order.orderId && !syncing && !orders.error) {
      setIssue(null);
    }
  }, [order, history.isSuccess, history.isFetching, mismatch, token, refresh, statuses, issue, syncing, orders.error]);
  useEffect(() => {
    const fresh = orders.data?.find(item => item.orderId === issue?.orderId);
    if (issue && fresh && !orders.error && !orders.isFetching && !syncing && issue.statuses.every(status => status === fresh.actualStatus)) setIssue(null);
  }, [issue, orders.data, orders.error, orders.isFetching, syncing]);

  return {
    history, syncing,
    blocked: mismatch || !!issue,
    syncError: issue?.error,
    retryOrders: () => void refresh(issue ?? (mismatch && order ? { orderId: order.orderId, statuses } : null)),
  };
}
