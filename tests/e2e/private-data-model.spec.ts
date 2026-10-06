import { expect, test } from "@playwright/test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createPrivateScope, PrivateScopeContext } from "@/shared/lib/query";
import { useAuthStore } from "@/entities/session/model/authStore";
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
      for (const key of ["users", "cart", "favorites", "orders", "addresses", "accounts", "transfers", "social-networks", "products"]) {
        client.setQueryData(scope.key([key]), { owner: "A" });
      }
      client.setQueryData(["admin", 1, "access"], { owner: "A" });
      client.setQueryData(["categories"], [1]);
      useCartQuantityStore.getState().syncWithServer([{ productId: 1, count: 3 }]);
      useAuthStore.setState({ sessionRevision: initial.sessionRevision + 1 });
      expect(client.getQueryData(scope.key(["users"]))).toEqual({ owner: "A" });
      expect(scope.isCurrent()).toBe(true);
      expect(draftsCleared).toBe(0);
      const late = deferred<string>();
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
