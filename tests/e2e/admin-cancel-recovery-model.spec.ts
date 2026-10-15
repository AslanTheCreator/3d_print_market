import { expect, test } from "@playwright/test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { adminOrderApi, type AdminOrderDto } from "@/entities/order";
import { useAdminCancelAction } from "@/features/admin-order-action/model/useAdminCancelAction";
import { createPrivateScope, PrivateScopeContext } from "@/shared/lib/query";
import { ApiError } from "@/shared/lib/errorHandler";
import { bindPrivateDataLifecycle } from "@/app/providers/privateDataLifecycle";
import { useAuthStore } from "@/entities/session/model/authStore";

const order = (agentId = 2, orderId = 201) => ({ sellerId: agentId, orderId, actualStatus: "BOOKED" }) as AdminOrderDto;
function capture(client: QueryClient, scope: ReturnType<typeof createPrivateScope>, agentId = 2, orderId = 201, changed = async () => {}) {
  let result!: ReturnType<typeof useAdminCancelAction>;
  function Probe() { result = useAdminCancelAction({ order: order(agentId, orderId), session: scope.id, changed }); return null; }
  renderToString(createElement(QueryClientProvider, { client }, createElement(PrivateScopeContext.Provider, { value: scope }, createElement(Probe))));
  return result;
}
const role = (client: QueryClient, session: number, value: string) => client.setQueryData(["admin", session, "access"], { role: value });

test("actual CANCEL guard blocks concurrent consumers and USER; acceptance persists after the role cycle", async () => {
  const client = new QueryClient(); const scope = createPrivateScope(1, () => true);
  const original = { act: adminOrderApi.act, find: adminOrderApi.find };
  let finish!: (value: number) => void;
  const pending = new Promise<number>(resolve => { finish = resolve; });
  let posts = 0, reads = 0, refreshes = 0;
  adminOrderApi.find = async () => { reads++; return order(); };
  adminOrderApi.act = () => { posts++; return pending; };
  role(client, 1, "ADMIN");
  try {
    const started = capture(client, scope, 2, 201, async () => { refreshes++; }).submit("A reason");
    await expect.poll(() => posts).toBe(1);
    role(client, 1, "USER");
    await capture(client, scope).submit("Another POST while USER");
    await capture(client, scope).checkResult();
    await capture(client, scope, 3, 202).submit("USER must not start an idle cancellation either");
    expect(reads).toBe(1); expect(posts).toBe(1);
    role(client, 1, "ADMIN");
    expect(capture(client, scope).busy).toBe(true);
    expect(capture(client, scope).canStartOtherAction()).toBe(false);
    await capture(client, scope).submit("Another POST after remount");
    expect(posts).toBe(1);
    role(client, 1, "USER"); finish(201); await started;
    expect(refreshes).toBe(0);
    role(client, 1, "ADMIN");
    expect(capture(client, scope).accepted).toBe(true);
    await capture(client, scope).submit("Another POST after acceptance");
    expect(posts).toBe(1);
  } finally { adminOrderApi.act = original.act; adminOrderApi.find = original.find; client.clear(); scope.dispose(); }
});

for (const status of ["ASSEMBLING", "AWAITING_PREPAYMENT_APPROVAL", "FAILED", "CANCELLED"] as const) test(`GET ${status} distinguishes CANCEL outcome from the transport guard for other actions`, async () => {
  const client = new QueryClient(); const scope = createPrivateScope(1, () => true);
  const original = { act: adminOrderApi.act, find: adminOrderApi.find };
  let posts = 0, reads = 0, refreshes = 0;
  adminOrderApi.find = async () => ({ ...order(), actualStatus: ++reads === 1 ? "BOOKED" : status });
  adminOrderApi.act = async () => { posts++; throw new ApiError("Lost", "NETWORK_ERROR"); };
  role(client, 1, "ADMIN");
  try {
    // Ссылка на guard из предыдущего render тоже должна видеть фактический pending.
    const previous = capture(client, scope, 2, 201, async () => { refreshes++; });
    const started = previous.submit("Persisted CANCEL reason");
    expect(previous.canStartOtherAction()).toBe(false);
    await started;
    const restored = capture(client, scope);
    expect(restored.busy).toBe(false);
    expect(restored.accepted).toBe(status === "CANCELLED");
    expect(restored.reconciled).toBe(status === "CANCELLED");
    expect(restored.unknown).toBe(status !== "CANCELLED");
    expect(restored.canStartOtherAction()).toBe(true);
    expect(refreshes).toBe(1);
    await restored.submit("Never repeat CANCEL"); expect(posts).toBe(1);
    role(client, 1, "USER"); expect(restored.canStartOtherAction()).toBe(false);
    role(client, 1, "ADMIN"); expect(restored.canStartOtherAction()).toBe(true);
    if (status !== "CANCELLED") {
      adminOrderApi.find = async () => order();
      await restored.checkResult();
      expect(capture(client, scope).unknown).toBe(true);
      expect(capture(client, scope).accepted).toBe(false);
      await capture(client, scope).submit("BOOKED must not reset guard"); expect(posts).toBe(1);
    }
    scope.dispose(); expect(restored.canStartOtherAction()).toBe(false);
  } finally { adminOrderApi.act = original.act; adminOrderApi.find = original.find; client.clear(); scope.dispose(); }
});

test("unknown CANCEL retains BOOKED recovery and isolates account, agentId, orderId without GC", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } });
  const scope = createPrivateScope(1, () => true); const scopeB = createPrivateScope(2, () => true);
  const original = { act: adminOrderApi.act, find: adminOrderApi.find };
  let posts = 0, reads = 0;
  adminOrderApi.find = async () => { reads++; return order(); };
  adminOrderApi.act = async () => { posts++; throw new ApiError("Lost", "NETWORK_ERROR"); };
  role(client, 1, "ADMIN"); role(client, 2, "ADMIN");
  try {
    await capture(client, scope).submit("Persisted reason");
    expect(capture(client, scope).unknown).toBe(true);
    role(client, 1, "USER"); const previousReads = reads;
    await capture(client, scope).submit("USER must not write"); await capture(client, scope).checkResult();
    expect(reads).toBe(previousReads);
    role(client, 1, "ADMIN");
    await capture(client, scope).checkResult(); await capture(client, scope).submit("BOOKED is not a rejection");
    expect(capture(client, scope).unknown).toBe(true);
    expect(capture(client, scope).comment).toBe("Persisted reason");
    expect(posts).toBe(1);
    for (const isolated of [capture(client, scope, 3), capture(client, scope, 2, 202), capture(client, scopeB)]) {
      expect(isolated.unknown).toBe(false); expect(isolated.busy).toBe(false); expect(isolated.accepted).toBe(false); expect(isolated.comment).toBe("");
    }
    expect(client.getQueryCache().find({ queryKey: scope.key(["adminOrderCancel", 2, 201]), exact: true })?.gcTime).toBe(Infinity);
  } finally { adminOrderApi.act = original.act; adminOrderApi.find = original.find; client.clear(); scope.dispose(); scopeB.dispose(); }
});

for (const outcome of ["accepted", "lost"] as const) test(`late CANCEL ${outcome} after account switch cannot recreate previous state`, async () => {
  const initial = useAuthStore.getState(); const client = new QueryClient();
  useAuthStore.setState({ isInitialized: true, isAuthenticated: true, accountRevision: 1 });
  const scope = createPrivateScope(1, () => useAuthStore.getState().accountRevision === 1);
  const unbind = bindPrivateDataLifecycle(client, scope, () => {}, () => {});
  const original = { act: adminOrderApi.act, find: adminOrderApi.find };
  let finish!: () => void, posts = 0;
  const pending = new Promise<number>((resolve, reject) => { finish = () => outcome === "accepted" ? resolve(201) : reject(new ApiError("Lost", "NETWORK_ERROR")); });
  adminOrderApi.find = async () => order();
  adminOrderApi.act = () => { posts++; return pending; };
  role(client, 1, "ADMIN");
  try {
    const started = capture(client, scope).submit("A reason");
    await expect.poll(() => posts).toBe(1);
    useAuthStore.setState({ sessionRevision: initial.sessionRevision + 1 });
    expect(capture(client, scope).busy).toBe(true);
    useAuthStore.setState({ accountRevision: 2 });
    expect(scope.signal.aborted).toBe(true);
    expect(client.getQueryCache().getAll()).toEqual([]);
    const scopeB = createPrivateScope(2, () => true); role(client, 2, "ADMIN");
    expect(capture(client, scopeB).comment).toBe("");
    finish(); await started;
    expect(client.getQueryData(scope.key(["adminOrderCancel", 2, 201]))).toBeUndefined();
    expect(capture(client, scopeB).unknown).toBe(false); expect(capture(client, scopeB).accepted).toBe(false);
    expect(capture(client, scopeB).busy).toBe(false); scopeB.dispose();
  } finally { adminOrderApi.act = original.act; adminOrderApi.find = original.find; unbind(); client.clear(); useAuthStore.setState(initial, true); }
});
