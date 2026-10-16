import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { useOrderCasesQuery, type ListOrdersDto, type ListOrdersModel, type OrderStatus } from "@/entities/order";
import { usePrivateScope } from "@/shared/lib/query";

interface SyncIssue { orderId: number; statuses: OrderStatus[]; error?: unknown; syncing?: boolean }

export function useOrderCaseHistory(order: ListOrdersModel | null, orders: UseQueryResult<ListOrdersDto[]>) {
  const scope = usePrivateScope();
  const history = useOrderCasesQuery(order?.orderId ?? null);
  const [checks, setChecks] = useState<{ scopeId: number | null; issues: Record<number, SyncIssue> }>({ scopeId: scope.id, issues: {} });
  const issues = useMemo(() => checks.scopeId === scope.id ? checks.issues : {}, [checks, scope.id]);
  const attempted = useRef(new Map<string, string>());
  const revisions = useRef(new Map<string, number>());
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const statuses = useMemo(() => [...new Set((history.data ?? []).flatMap(detail => detail.orderStatus ? [detail.orderStatus] : []))], [history.data]);
  const mismatch = !!order && statuses.some(status => status !== order.actualStatus);
  const { refetch } = orders;
  const saveIssue = useCallback((orderId: number, issue: SyncIssue | null) => {
    if (!mounted.current || !scope.isCurrent()) return;
    setChecks(previous => {
      if (!scope.isCurrent()) return previous;
      const issues = previous.scopeId === scope.id ? { ...previous.issues } : {};
      if (issue) issues[orderId] = issue; else delete issues[orderId];
      return { scopeId: scope.id, issues };
    });
  }, [scope]);
  const refresh = useCallback(async (expected: SyncIssue) => {
    if (!scope.isCurrent()) return;
    const key = `${scope.id}:${expected.orderId}`;
    const run = (revisions.current.get(key) ?? 0) + 1;
    revisions.current.set(key, run);
    saveIssue(expected.orderId, { ...expected, syncing: true });
    try {
      const result = await refetch();
      if (!mounted.current || !scope.isCurrent() || run !== revisions.current.get(key)) return;
      const fresh = result.data?.find(item => item.orderId === expected.orderId);
      if (result.error) throw result.error;
      if (!fresh || expected.statuses.some(status => status !== fresh.actualStatus)) {
        throw new Error("Статусы заказа и обращений расходятся. Повторите обновление или откройте детали заново.");
      }
      saveIssue(expected.orderId, null);
    } catch (error) {
      if (mounted.current && scope.isCurrent() && run === revisions.current.get(key)) saveIssue(expected.orderId, { ...expected, error, syncing: false });
    }
  }, [refetch, scope, saveIssue]);

  const token = order ? `${scope.id}:${order.orderId}:${history.dataUpdatedAt}` : "";
  const issue = order ? issues[order.orderId] : undefined;
  const syncing = !!issue?.syncing;
  useEffect(() => {
    if (!order || !history.isSuccess || history.isFetching) return;
    const key = `${scope.id}:${order.orderId}`;
    if (mismatch && attempted.current.get(key) !== token) {
      attempted.current.set(key, token);
      void refresh({ orderId: order.orderId, statuses });
    } else if (!mismatch && statuses.length > 0 && issue && !syncing && !orders.error) {
      revisions.current.set(key, (revisions.current.get(key) ?? 0) + 1);
      saveIssue(order.orderId, null);
    }
  }, [order, history.isSuccess, history.isFetching, mismatch, token, refresh, statuses, issue, syncing, orders.error, scope.id, saveIssue]);
  useEffect(() => {
    if (orders.error || orders.isFetching) return;
    for (const issue of Object.values(issues)) {
      const fresh = orders.data?.find(item => item.orderId === issue.orderId);
      if (fresh && !issue.syncing && issue.statuses.every(status => status === fresh.actualStatus)) saveIssue(issue.orderId, null);
    }
  }, [issues, orders.data, orders.error, orders.isFetching, saveIssue]);

  const forOrder = (orderId: number) => {
    const issue = issues[orderId];
    const selectedMismatch = order?.orderId === orderId && mismatch;
    return { syncing: !!issue?.syncing, blocked: selectedMismatch || !!issue?.statuses.length || !!issue?.error,
      syncError: issue?.error,
      retryOrders: () => void refresh(issue ?? { orderId, statuses: selectedMismatch ? statuses : [] }),
    };
  };
  const blockedOrderIds = Object.values(issues).filter(issue => issue.statuses.length > 0 || issue.error).map(issue => issue.orderId);
  return { history, forOrder, blockedOrderIds, ...(order ? forOrder(order.orderId) : { syncing: false, blocked: false, syncError: undefined, retryOrders: () => void refetch() }) };
}
