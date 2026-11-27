import { expect, test } from "@playwright/test";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { adminOrderKeys, invalidateDeliveryReads, orderQueryKeys } from "@/entities/order";
import { createPrivateScope } from "@/shared/lib/query";

test("admin review refreshes visible global, agent and participant reads without touching another agent or session", async () => {
  const client = new QueryClient();
  const scope = createPrivateScope(1, () => true);
  client.setQueryData(["admin", 1, "access"], { id: 8, role: "ADMIN" });
  const pending = scope.key(orderQueryKeys.adminReviewAttempt(2, 201));
  client.setQueryData(pending, { blocked: true });
  const cases = [
    { key: adminOrderKeys.list(1, { page: 0 }), reads: 1 },
    { key: adminOrderKeys.list(1, { page: 3, agentId: 2 }), reads: 1 },
    { key: adminOrderKeys.list(1, { page: 0, agentId: 3 }), reads: 0 },
    { key: adminOrderKeys.list(2, { page: 0, agentId: 2 }), reads: 0 },
    { key: adminOrderKeys.history(1, 2, 201), reads: 1 },
    { key: adminOrderKeys.history(1, 3, 201), reads: 0 },
    { key: scope.key(orderQueryKeys.sellerOrders()), reads: 1 },
    { key: scope.key(orderQueryKeys.customerOrders()), reads: 1 },
    { key: scope.key(orderQueryKeys.termsHistory(201)), reads: 1 },
  ];
  const counts = cases.map(() => 0);
  const subscriptions = cases.map(({ key }, i) => new QueryObserver(client, {
    queryKey: key, initialData: [], staleTime: Infinity, queryFn: () => { counts[i]++; return []; },
  }).subscribe(() => {}));
  try {
    await invalidateDeliveryReads(client, scope, 201, { role: "admin", agentId: 2 }, 0);
    expect(counts).toEqual(cases.map(item => item.reads));
    expect(client.getQueryData(pending)).toEqual({ blocked: true });
  } finally {
    subscriptions.forEach(unsubscribe => unsubscribe());
    scope.dispose();
    client.clear();
  }
});

test("admin clears only the participant row belonging to the reviewed agent", async () => {
  const client = new QueryClient();
  const scope = createPrivateScope(1, () => true);
  const key = scope.key(orderQueryKeys.customerOrders());
  const rows = [2, 3].map(sellerId => ({ orderId: 201, product: { sellerId }, calculation: { known: true } }));
  client.setQueryData(key, rows);
  try {
    await invalidateDeliveryReads(client, scope, 201, { role: "admin", agentId: 2 });
    expect(client.getQueryData(key)).toEqual([{ ...rows[0], calculation: null }, rows[1]]);
  } finally {
    scope.dispose();
    client.clear();
  }
});
