import { expect, test } from "@playwright/test";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { bindCartQuantityProjection } from "@/entities/cart/model/cartQuantityProjection";
import { useCartQuantityStore } from "@/entities/cart/model/cartQuantityStore";
import { createPrivateScope } from "@/shared/lib/query";
import { cartKeys } from "@/entities/cart/model/queryKeys";
import type { ProductBasket } from "@/entities/cart/model/types";
import type { useCartChecks } from "@/entities/cart/model/useCartChecks";
import { cartApi } from "@/entities/cart/api/cartApi";
import { useUpdateCartQuantity } from "@/entities/cart/model/useCartMutations";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { QueryClientProvider } from "@tanstack/react-query";
import { PrivateScopeContext } from "@/shared/lib/query";

function load(file: string, mocks: Record<string, unknown>) {
  const module = { exports: {} as Record<string, unknown> };
  vm.runInNewContext(ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    module, exports: module.exports, WeakMap, Set,
    require: (name: string) => {
      if (!(name in mocks)) throw new Error(`Missing mock: ${name}`);
      return mocks[name];
    },
  });
  return module.exports;
}

test("40 cards share one projection and membership index and perform no totals or persistence", () => {
  const client = new QueryClient();
  const scope = createPrivateScope(1, () => true);
  const key = scope.key(cartKeys.all);
  const counters = { sync: 0, effects: 0, quantityReads: 0, priceReads: 0, maps: 0, persist: 0 };
  const cart = Array.from({ length: 40 }, (_, i) => ({
    product: { id: i + 1, get price() { counters.priceReads++; return 100; } },
    count: i + 1, availableCount: 100, enoughStock: true,
  })) as ProductBasket[];
  const store = useCartQuantityStore.getState();
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    localStorage: { setItem: () => counters.persist++, removeItem: () => undefined },
  } });
  useCartQuantityStore.setState({ items: [], syncStates: {},
    syncWithServer: items => { counters.sync++; store.syncWithServer(items); },
    getQuantity: id => { counters.quantityReads++; return store.getQuantity(id); },
  });
  const unbind = bindCartQuantityProjection(client, scope);
  const observers = Array.from({ length: 80 }, () => {
    const observer = new QueryObserver(client, { queryKey: key, enabled: false });
    return observer.subscribe(() => undefined);
  });
  try {
    client.setQueryData(key, cart);
    // Count traversals only on the structurally shared cache snapshot used by readers.
    const snapshot = client.getQueryData<ProductBasket[]>(key)!;
    const originalMap = snapshot.map;
    Object.defineProperty(snapshot, "map", { configurable: true, value: (...args: Parameters<typeof originalMap>) => {
      counters.maps++;
      return originalMap.apply(snapshot, args);
    } });
    const queryHooks = load("src/entities/cart/model/useCartQueries.ts", {
      "@/shared/lib/query": { usePrivateScope: () => scope },
      "@tanstack/react-query": { useQuery: () => ({ data: snapshot, dataUpdatedAt: 1 }) },
      react: { useEffect: (effect: () => void) => { counters.effects++; effect(); } },
      "../api/cartApi": { cartApi }, "./queryKeys": { cartKeys },
      "./cartQuantityStore": { useCartQuantityStore },
    });
    const checks = load("src/entities/cart/model/useCartChecks.ts", {
      "./useCartQueries": queryHooks,
      "@/entities/cart": { ...queryHooks, useCartQuantityStore },
    }).useCartChecks as typeof useCartChecks;
    for (let card = 1; card <= 40; card++) {
      // The add action and quantity action both consume membership in each card.
      for (let path = 0; path < 2; path++) {
        const result = checks(true);
        expect(result.isProductInCart(card)).toBe(true);
        expect(result.isProductInCart(999)).toBe(false);
        expect(result.getCartItemsCount).toBe(40);
      }
    }
    expect(checks(false).getCartItemsCount).toBe(0);
    expect(checks(false).isProductInCart(1)).toBe(false);
    expect(counters).toEqual({ sync: 1, effects: 0, quantityReads: 0, priceReads: 0, maps: 1, persist: 0 });
    const confirmed = useCartQuantityStore.getState();
    client.setQueryData(key, snapshot);
    expect(counters.sync).toBe(2);
    expect(useCartQuantityStore.getState()).toBe(confirmed);
    expect(counters.persist).toBe(0);
  } finally {
    observers.forEach(unsubscribe => unsubscribe()); unbind(); client.clear();
    useCartQuantityStore.setState({ ...store, items: [], syncStates: {} }, true);
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("projection follows its scope, cached mount and teardown, including identical validation", () => {
  const client = new QueryClient();
  const scopeA = createPrivateScope(1, () => true);
  const scopeB = createPrivateScope(2, () => true);
  const cart = (count: number) => [{ product: { id: 1 }, count }] as ProductBasket[];
  useCartQuantityStore.getState().clearQuantities();
  client.setQueryData(scopeA.key(cartKeys.all), cart(2));
  const unbindA = bindCartQuantityProjection(client, scopeA);
  try {
    expect(useCartQuantityStore.getState().getQuantity(1)).toBe(2);
    const revision = useCartQuantityStore.getState().setQuantity(1, 5);
    client.setQueryData(scopeA.key(cartKeys.all), cart(2));
    expect(useCartQuantityStore.getState().getQuantity(1)).toBe(5);
    useCartQuantityStore.getState().markNeedsValidation(1, revision);
    client.setQueryData(scopeA.key(cartKeys.all), cart(2));
    expect(useCartQuantityStore.getState().getSyncStatus(1)).toBe("synced");
    scopeA.dispose();
    useCartQuantityStore.getState().clearQuantities();
    client.setQueryData(scopeA.key(cartKeys.all), cart(9));
    expect(useCartQuantityStore.getState().items).toEqual([]);
    const unbindB = bindCartQuantityProjection(client, scopeB);
    client.setQueryData(scopeB.key(cartKeys.all), cart(3));
    client.setQueryData(scopeA.key(cartKeys.all), cart(8));
    expect(useCartQuantityStore.getState().getQuantity(1)).toBe(3);
    unbindB();
    client.setQueryData(scopeB.key(cartKeys.all), cart(4));
    expect(useCartQuantityStore.getState().getQuantity(1)).toBe(3);
  } finally { unbindA(); client.clear(); useCartQuantityStore.getState().clearQuantities(); }
});

test("manual confirmation reconciles once without card observers and preserves the GET queue", async () => {
  const client = new QueryClient();
  const scope = createPrivateScope(1, () => true);
  const store = useCartQuantityStore.getState();
  const originalApi = { ...cartApi };
  let reads = 0;
  let syncs = 0;
  cartApi.update = async () => undefined;
  cartApi.getCart = async () => { reads++; return [{ product: { id: 1 }, count: 3 }] as ProductBasket[]; };
  useCartQuantityStore.setState({ items: [], syncStates: {}, syncWithServer: items => { syncs++; store.syncWithServer(items); } });
  const unbind = bindCartQuantityProjection(client, scope);
  try {
    client.setQueryData(scope.key(cartKeys.all), [{ product: { id: 1 }, count: 1 }]);
    let mutation!: ReturnType<typeof useUpdateCartQuantity>;
    function Probe() { mutation = useUpdateCartQuantity(1); return null; }
    renderToString(createElement(QueryClientProvider, { client },
      createElement(PrivateScopeContext.Provider, { value: scope }, createElement(Probe))));
    const revision = useCartQuantityStore.getState().setQuantity(1, 3);
    await mutation.mutateAsync({ count: 3, revision });
    expect(reads).toBe(1);
    expect(syncs).toBe(2);
    expect(useCartQuantityStore.getState().getQuantity(1)).toBe(3);
    expect(useCartQuantityStore.getState().getSyncStatus(1)).toBe("synced");
  } finally { unbind(); Object.assign(cartApi, originalApi); client.clear(); useCartQuantityStore.setState({ ...store, items: [], syncStates: {} }, true); }
});
