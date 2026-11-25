import { expect, test } from "@playwright/test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createPrivateScope, PrivateScopeContext } from "@/shared/lib/query";
import { useAuthStore } from "@/entities/session/model/authStore";
import { customerPaymentState, protectedAttempt, type Attempt } from "@/features/order-payment/model/customerPaymentState";

const pending = (): Attempt => ({ token: Symbol(), phase: "posting", busy: true, version: 0, terms: "fixture", imageId: 77, message: "" });
import { bindPrivateDataLifecycle } from "@/app/providers/privateDataLifecycle";
import { useRemoveFromCart, useUpdateCartQuantity } from "@/entities/cart/model/useCartMutations";
import { cartApi } from "@/entities/cart/api/cartApi";
import { cartKeys } from "@/entities/cart/model/queryKeys";
import { useCartQuantityStore } from "@/entities/cart/model/cartQuantityStore";
import { useDeleteAccount } from "@/entities/account/model/useAccountsMutations";
import { accountsApi } from "@/entities/account/api/accountsApi";
import { accountsKeys } from "@/entities/account/model/queryKeys";
import { readProductFormDraft, writeProductFormDraft, clearProductFormDraft } from "@/widgets/create-product-form/model/productFormDraft";
import { defaultProductFormValues } from "@/entities/product/model/form";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function captureHook<T>(client: QueryClient, scope: ReturnType<typeof createPrivateScope>, hook: () => T): T {
  let result!: T;
  function Probe() { result = hook(); return null; }
  renderToString(createElement(QueryClientProvider, { client },
    createElement(PrivateScopeContext.Provider, { value: scope }, createElement(Probe))));
  return result;
}

test("all private namespaces are removed on logout, expiry and direct account switch; refresh keeps data", async () => {
  const initial = useAuthStore.getState();
  for (const change of ["logout", "expiry", "switch"] as const) {
    const client = new QueryClient();
    useAuthStore.setState({ isInitialized: true, isAuthenticated: true, accountRevision: 1 });
    const scope = createPrivateScope(1, () => useAuthStore.getState().isAuthenticated && useAuthStore.getState().accountRevision === 1);
    let draftsCleared = 0;
    const unbind = bindPrivateDataLifecycle(client, scope, () => useCartQuantityStore.getState().clearQuantities(), () => { draftsCleared++; });
    try {
      for (const key of ["users", "cart", "favorites", "orders", "orderImages", "orderCancel", "orderCaseCreate", "disputePayment", "adminOrderCancel", "addresses", "accounts", "transfers", "social-networks", "products"]) {
        client.setQueryData(scope.key([key]), { owner: "A" });
      }
      client.setQueryData(["admin", 1, "access"], { owner: "A" });
      client.setQueryData(["admin", 1, "case-operation", 301], { owner: "A", comment: "Private resolution" });
      client.setQueryData(["categories"], [1]);
      useCartQuantityStore.getState().syncWithServer([{ productId: 1, count: 3 }]);
      useAuthStore.setState({ sessionRevision: initial.sessionRevision + 1 });
      expect(client.getQueryData(scope.key(["users"]))).toEqual({ owner: "A" });
      expect(scope.isCurrent()).toBe(true);
      expect(draftsCleared).toBe(0);
      const late = deferred<string>();
      const attempt = customerPaymentState(client, scope, 42, 1, "full");
      attempt.confirmVersion(3);
      expect(attempt.begin(pending())).toBe(true);
      let signal!: AbortSignal;
      const request = client.fetchQuery({ queryKey: scope.key(["late"]), queryFn: context => {
        signal = context.signal;
        return late.promise;
      } }).catch(() => undefined);
      if (change === "logout") useAuthStore.getState().logout();
      if (change === "expiry") useAuthStore.setState({ isAuthenticated: false, user: null });
      if (change === "switch") useAuthStore.setState({ accountRevision: 2 });
      late.resolve("A");
      await request;
      expect(signal.aborted).toBe(true);
      expect(scope.isCurrent()).toBe(false);
      expect(client.getQueryCache().getAll().map(query => query.queryKey)).toEqual([["categories"]]);
      expect(useCartQuantityStore.getState().items).toEqual([]);
      expect(draftsCleared).toBe(1);
    } finally { unbind(); client.clear(); }
  }
  useAuthStore.setState(initial, true);
});

test("viewing 100 orders retains only attempts that actually need protection", () => {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 300_000 } } });
  const scope = createPrivateScope(1, () => true);
  try {
    for (let orderId = 1; orderId <= 100; orderId++) {
      for (const kind of ["full", "prepayment"] as const) {
        const store = customerPaymentState(client, scope, orderId, 1, kind);
        const off = store.subscribe(() => {});
        expect(store.read()).toBeUndefined();
        expect(store.minimumVersion()).toBeUndefined();
        off();
      }
    }
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    const store = customerPaymentState(client, scope, 42, 1, "full");
    const a = pending();
    expect(store.begin(a)).toBe(true);
    expect(client.getQueryCache().getAll().map(query => query.gcTime)).toEqual([Infinity]);
    store.update({ ...a, phase: "unknown", busy: false });
    expect(store.read()?.phase).toBe("unknown");
    expect(store.begin(pending())).toBe(false);
    store.confirmVersion(0);
    expect(store.minimumVersion()).toBe(0);
    store.confirmVersion(2);
    for (const old of [1, -1, 2.5, Number.MAX_SAFE_INTEGER + 1]) store.confirmVersion(old);
    expect(customerPaymentState(client, scope, 42, 1, "prepayment").minimumVersion()).toBe(2);
    expect(customerPaymentState(client, scope, 43, 1, "full").minimumVersion()).toBeUndefined();
  } finally { client.clear(); }
});

test("late payment response cannot recreate the previous session or unlock the next session's attempt", () => {
  const client = new QueryClient();
  const previous = createPrivateScope(1, () => true);
  const current = createPrivateScope(2, () => true);
  const a = pending(), b = pending();
  try {
    const original = customerPaymentState(client, previous, 42, 1, "full");
    expect(original.begin(a)).toBe(true);
    expect(original.begin(pending())).toBe(false);
    expect(customerPaymentState(client, previous, 42, 1, "prepayment").begin(pending())).toBe(false);
    previous.dispose();
    client.removeQueries({ queryKey: previous.key([]) });
    const next = customerPaymentState(client, current, 42, 2, "full");
    expect(next.begin(b)).toBe(true);
    original.update({ ...a, phase: "accepted" });
    original.update({ ...a, phase: "unknown" });
    expect(client.getQueryCache().findAll({ queryKey: previous.key([]) })).toHaveLength(0);
    expect(protectedAttempt(next.read())).toBe(true);
    next.update({ ...b, phase: "verified", busy: false });
    expect(protectedAttempt(next.read())).toBe(false);
    next.discard();
    expect(client.getQueryCache().getAll()).toHaveLength(0);
  } finally { client.clear(); }
});

test("late optimistic rollback cannot restore A into B or recreate A cache", async () => {
  const client = new QueryClient();
  const scopeA = createPrivateScope(1, () => true);
  const scopeB = createPrivateScope(2, () => true);
  const response = deferred<void>();
  const original = accountsApi.delete;
  accountsApi.delete = () => response.promise;
  try {
    client.setQueryData(scopeA.key(accountsKeys.userList()), [{ id: 7 }]);
    const mutation = captureHook(client, scopeA, useDeleteAccount);
    const result = mutation.mutateAsync(7).catch(() => undefined);
    await expect.poll(() => client.getQueryData(scopeA.key(accountsKeys.userList()))).toEqual([]);
    scopeA.dispose();
    client.removeQueries({ queryKey: ["private", 1] });
    client.setQueryData(scopeB.key(accountsKeys.userList()), [{ id: 9 }]);
    response.reject(new Error("delayed A failure"));
    await result;
    expect(client.getQueryData(scopeB.key(accountsKeys.userList()))).toEqual([{ id: 9 }]);
    expect(client.getQueryData(scopeA.key(accountsKeys.userList()))).toBeUndefined();
  } finally { accountsApi.delete = original; client.clear(); }
});

test("late manual cart refresh cannot write B projection, including a reused product revision", async () => {
  const client = new QueryClient();
  const scopeA = createPrivateScope(1, () => true);
  const scopeB = createPrivateScope(2, () => true);
  const response = deferred<Awaited<ReturnType<typeof cartApi.getCart>>>();
  const original = { ...cartApi };
  let signal: AbortSignal | undefined;
  cartApi.update = async () => undefined;
  cartApi.getCart = async (_params, requestSignal) => { signal = requestSignal; return response.promise; };
  try {
    useCartQuantityStore.getState().clearQuantities();
    useCartQuantityStore.getState().syncWithServer([{ productId: 1, count: 1 }]);
    const revision = useCartQuantityStore.getState().setQuantity(1, 4);
    const mutation = captureHook(client, scopeA, () => useUpdateCartQuantity(1));
    const result = mutation.mutateAsync({ count: 4, revision });
    await expect.poll(() => Boolean(signal)).toBe(true);
    scopeA.dispose();
    useCartQuantityStore.getState().clearQuantities();
    useCartQuantityStore.getState().syncWithServer([{ productId: 1, count: 2 }]);
    useCartQuantityStore.getState().setQuantity(1, 5);
    client.setQueryData(scopeB.key(cartKeys.all), ["B"]);
    response.resolve([]);
    await result;
    expect(signal?.aborted).toBe(true);
    expect(useCartQuantityStore.getState().getQuantity(1)).toBe(5);
    expect(useCartQuantityStore.getState().getSyncStatus(1)).toBe("pending");
    expect(client.getQueryData(scopeB.key(cartKeys.all))).toEqual(["B"]);
    expect(client.getQueryData(scopeA.key(cartKeys.all))).toBeUndefined();
  } finally { Object.assign(cartApi, original); client.clear(); useCartQuantityStore.getState().clearQuantities(); }
});

test("queued mutation from an ended scope never sends a new request", async () => {
  const client = new QueryClient();
  const scope = createPrivateScope(1, () => true);
  const original = cartApi.removeFromCart;
  let requests = 0;
  cartApi.removeFromCart = async () => { requests++; };
  try {
    const mutation = captureHook(client, scope, useRemoveFromCart);
    scope.dispose();
    await expect(mutation.mutateAsync(1)).rejects.toThrow("Session ended");
    expect(requests).toBe(0);
  } finally { cartApi.removeFromCart = original; client.clear(); }
});

test("draft owner isolates memory and disk even when removal fails; clear releases owned blobs", () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const revoke = URL.revokeObjectURL;
  const revoked: string[] = [];
  const disk = new Map<string, string>();
  let removeFails = false;
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: {
    getItem: (key: string) => disk.get(key) ?? null,
    setItem: (key: string, value: string) => disk.set(key, value),
    removeItem: (key: string) => { if (removeFails) throw new Error("Denied"); disk.delete(key); },
  } } });
  URL.revokeObjectURL = url => { revoked.push(url); };
  try {
    clearProductFormDraft();
    const draft = { values: { ...defaultProductFormValues, name: "A" }, imageIds: [7], images: [{ id: 7, preview: "blob:owned-by-A" }] };
    expect(writeProductFormDraft(draft, 1)).toBe("saved");
    expect(readProductFormDraft(1)?.values.name).toBe("A");
    removeFails = true;
    expect(clearProductFormDraft()).toBe("error");
    expect(revoked).toEqual(["blob:owned-by-A"]);
    expect(readProductFormDraft(2)).toBeNull();
    expect(disk.size).toBe(1);
    expect(writeProductFormDraft({ ...draft, values: { ...draft.values, name: "B" }, images: [] }, 2)).toBe("saved");
    expect(readProductFormDraft(2)?.values.name).toBe("B");
  } finally {
    removeFails = false;
    clearProductFormDraft();
    URL.revokeObjectURL = revoke;
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
