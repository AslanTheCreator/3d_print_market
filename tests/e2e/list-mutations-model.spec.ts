import { expect, test } from "@playwright/test";
import { CanceledError } from "axios";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider, QueryObserver } from "@tanstack/react-query";
import { createPrivateScope, PrivateScopeContext } from "@/shared/lib/query";
import { ApiError, transformToApiError } from "@/shared/lib/errorHandler";
import { useAddToFavorites, useRemoveFromFavorites } from "@/entities/favorite/model/useFavoritesMutations";
import { favoritesApi } from "@/entities/favorite/api/favoritesApi";
import { favoritesKeys } from "@/entities/favorite/model/queryKeys";
import { productKeys } from "@/entities/product/model/queryKeys";
import type { Product } from "@/entities/product/model/types";
import { useRemoveFromCart } from "@/entities/cart/model/useCartMutations";
import { useCartItemRemoval } from "@/entities/cart/model/useCartItemRemoval";
import { cartApi } from "@/entities/cart/api/cartApi";
import { cartKeys } from "@/entities/cart/model/queryKeys";
import type { ProductBasket } from "@/entities/cart/model/types";
import { orderFixture } from "./helpers/mobileAccount";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function capture<T>(client: QueryClient, scope: ReturnType<typeof createPrivateScope>, hook: () => T): T {
  let result!: T;
  function Probe() { result = hook(); return null; }
  renderToString(createElement(QueryClientProvider, { client },
    createElement(PrivateScopeContext.Provider, { value: scope }, createElement(Probe))));
  return result;
}
const product = (id: number): Product => ({ ...orderFixture(id, "BOOKED", 1).product, id,
  currency: "RUB", status: "ACTIVE", availability: "PURCHASABLE", image: [] });

test("late failure of A rolls back only A after B succeeds; GET waits for every toggle", async () => {
  const client = new QueryClient();
  const scope = createPrivateScope(1, () => true);
  const key = scope.key(favoritesKeys.lists());
  const a = deferred<void>();
  const finalRead = deferred<Product[]>();
  const original = { ...favoritesApi };
  const errors: ApiError[] = [];
  let reads = 0;
  favoritesApi.removeFromFavorites = id => id === 1 ? a.promise : Promise.resolve();
  favoritesApi.getFavorites = () => { reads++; return finalRead.promise; };
  client.setQueryData(key, [product(1), product(2), product(3)]);
  const observer = new QueryObserver(client, { queryKey: key, queryFn: () => favoritesApi.getFavorites({ size: 50 }), staleTime: Infinity });
  const unsubscribe = observer.subscribe(() => {});
  try {
    const remove = capture(client, scope, () => useRemoveFromFavorites({ onError: error => errors.push(error) }));
    const failure = remove.mutateAsync(1).catch(() => undefined);
    await expect.poll(() => client.getQueryData<Product[]>(key)?.map(p => p.id)).toEqual([2, 3]);
    await remove.mutateAsync(2);
    expect(client.getQueryData<Product[]>(key)?.map(p => p.id)).toEqual([3]);
    expect(reads).toBe(0);
    a.reject(new Error("Отказ A"));
    await expect.poll(() => reads).toBe(1);
    expect(client.getQueryData<Product[]>(key)?.map(p => p.id).sort()).toEqual([1, 3]);
    expect(errors.map(error => error.message)).toEqual(["Отказ A"]);
    finalRead.resolve([product(1), product(3)]);
    await failure;
    expect(client.getQueryData(key)).toEqual([product(1), product(3)]);
  } finally { unsubscribe(); Object.assign(favoritesApi, original); client.clear(); }
});

test("infinite add uses later pages, never duplicates, and survives another item's failed rollback", async () => {
  const client = new QueryClient();
  const scope = createPrivateScope(1, () => true);
  const key = scope.key(favoritesKeys.lists());
  const original = { ...favoritesApi };
  const failure = deferred<void>();
  favoritesApi.removeFromFavorites = () => failure.promise;
  favoritesApi.addToFavorites = async () => undefined;
  client.setQueryData(key, [product(1)]);
  client.setQueryData([...productKeys.catalog(1), 12], { pages: [[product(2)], [product(3)]], pageParams: [null, { lastId: 2 }] });
  try {
    const remove = capture(client, scope, useRemoveFromFavorites);
    const add = capture(client, scope, useAddToFavorites);
    const pending = remove.mutateAsync(1).catch(() => undefined);
    await expect.poll(() => client.getQueryData(key)).toEqual([]);
    await add.mutateAsync(3);
    await add.mutateAsync(3);
    expect(client.getQueryData<Product[]>(key)?.map(p => p.id)).toEqual([3]);
    failure.reject(new Error("Delete failed"));
    await pending;
    expect(client.getQueryData<Product[]>(key)?.map(p => p.id).sort()).toEqual([1, 3]);
    expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  } finally { Object.assign(favoritesApi, original); client.clear(); }
});

test("older rollback cannot overwrite a newer successful toggle of the same product", async () => {
  const client = new QueryClient();
  const scope = createPrivateScope(1, () => true);
  const key = scope.key(favoritesKeys.lists());
  const original = { ...favoritesApi };
  const failure = deferred<void>();
  favoritesApi.addToFavorites = () => failure.promise;
  favoritesApi.removeFromFavorites = async () => undefined;
  client.setQueryData(key, []);
  client.setQueryData(productKeys.catalog(1), { pages: [[product(1)]], pageParams: [null] });
  try {
    const add = capture(client, scope, useAddToFavorites);
    const remove = capture(client, scope, useRemoveFromFavorites);
    const pending = add.mutateAsync(1).catch(() => undefined);
    await expect.poll(() => client.getQueryData<Product[]>(key)?.length).toBe(1);
    await remove.mutateAsync(1);
    failure.reject(new Error("Late failure"));
    await pending;
    expect(client.getQueryData(key)).toEqual([]);
  } finally { Object.assign(favoritesApi, original); client.clear(); }
});

test("a new toggle cancels settlement GET and still performs its own final refetch", async () => {
  const client = new QueryClient();
  const scope = createPrivateScope(1, () => true);
  const key = scope.key(favoritesKeys.lists());
  const original = { ...favoritesApi };
  const reads = [deferred<Product[]>(), deferred<Product[]>()];
  let readCount = 0;
  favoritesApi.removeFromFavorites = async () => undefined;
  favoritesApi.getFavorites = () => reads[readCount++].promise;
  client.setQueryData(key, [product(1), product(2)]);
  const observer = new QueryObserver(client, {
    queryKey: key, queryFn: ({ signal }) => favoritesApi.getFavorites({ size: 50 }, signal), staleTime: Infinity,
  });
  const unsubscribe = observer.subscribe(() => {});
  try {
    const remove = capture(client, scope, useRemoveFromFavorites);
    const first = remove.mutateAsync(1);
    await expect.poll(() => readCount).toBe(1);
    const second = remove.mutateAsync(2);
    await expect.poll(() => readCount).toBe(2);
    reads[0].resolve([product(2)]);
    expect(client.getQueryData(key)).toEqual([]);
    reads[1].resolve([]);
    await Promise.all([first, second]);
    expect(client.getQueryData(key)).toEqual([]);
  } finally { unsubscribe(); Object.assign(favoritesApi, original); client.clear(); }
});

test("late favorite failure cannot notify or restore a disposed account scope", async () => {
  const client = new QueryClient();
  const scopeA = createPrivateScope(1, () => true);
  const scopeB = createPrivateScope(2, () => true);
  const original = favoritesApi.removeFromFavorites;
  const response = deferred<void>();
  const errors: ApiError[] = [];
  favoritesApi.removeFromFavorites = () => response.promise;
  client.setQueryData(scopeA.key(favoritesKeys.lists()), [product(1)]);
  try {
    const remove = capture(client, scopeA, () => useRemoveFromFavorites({ onError: error => errors.push(error) }));
    const pending = remove.mutateAsync(1).catch(() => undefined);
    await expect.poll(() => client.getQueryData(scopeA.key(favoritesKeys.lists()))).toEqual([]);
    scopeA.dispose();
    client.removeQueries({ queryKey: ["private", 1] });
    client.setQueryData(scopeB.key(favoritesKeys.lists()), [product(2)]);
    response.reject(new Error("Late A failure"));
    await pending;
    expect(errors).toEqual([]);
    expect(client.getQueryData(scopeA.key(favoritesKeys.lists()))).toBeUndefined();
    expect(client.getQueryData(scopeB.key(favoritesKeys.lists()))).toEqual([product(2)]);
  } finally { favoritesApi.removeFromFavorites = original; client.clear(); }
});

for (const action of ["add", "remove", "cart"] as const) {
  test(`${action}: errors are normalized once; cancellation and expired scope stay silent`, async () => {
    const client = new QueryClient();
    const scope = createPrivateScope(1, () => true);
    const originals = { ...favoritesApi, ...cartApi };
    const errors: ApiError[] = [];
    let error: Error = new Error("Отказ записи");
    const fail = async () => { throw error; };
    favoritesApi.addToFavorites = fail;
    favoritesApi.removeFromFavorites = fail;
    cartApi.removeFromCart = fail;
    try {
      const options = { onError: (value: ApiError) => errors.push(value) };
      const mutation = capture(client, scope, () => action === "add" ? useAddToFavorites(options)
        : action === "remove" ? useRemoveFromFavorites(options) : useRemoveFromCart(options));
      await mutation.mutateAsync(1).catch(() => undefined);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toBeInstanceOf(ApiError);
      for (const cancellation of [new CanceledError(), transformToApiError(new CanceledError()), new DOMException("Aborted", "AbortError")]) {
        error = cancellation;
        await mutation.mutateAsync(1).catch(() => undefined);
        expect(errors).toHaveLength(1);
      }
      scope.dispose();
      await mutation.mutateAsync(1).catch(() => undefined);
      expect(errors).toHaveLength(1);
    } finally {
      favoritesApi.addToFavorites = originals.addToFavorites;
      favoritesApi.removeFromFavorites = originals.removeFromFavorites;
      cartApi.removeFromCart = originals.removeFromCart;
      client.clear();
    }
  });
}

test("cart DELETE failure is reported once even when settlement GET succeeds; retry removes item", async () => {
  const client = new QueryClient();
  const scope = createPrivateScope(1, () => true);
  const key = scope.key(cartKeys.all);
  const original = { ...cartApi };
  const item: ProductBasket = { product: product(1), count: 1, availableCount: 2, enoughStock: true };
  let server = [item];
  let reads = 0;
  let fail = true;
  const errors: string[] = [];
  cartApi.removeFromCart = async () => { if (fail) throw new Error("Отказ удаления"); server = []; };
  cartApi.getCart = async () => { reads++; return server; };
  client.setQueryData(key, server);
  const observer = new QueryObserver(client, { queryKey: key, queryFn: () => cartApi.getCart({ size: 100 }), staleTime: Infinity });
  const unsubscribe = observer.subscribe(() => {});
  try {
    const mutation = capture(client, scope, () => useRemoveFromCart({ onError: error => errors.push(error.message) }));
    await mutation.mutateAsync(1).catch(() => undefined);
    expect(client.getQueryData(key)).toEqual([item]);
    expect(reads).toBe(1);
    expect(errors).toEqual(["Отказ удаления"]);
    fail = false;
    await mutation.mutateAsync(1);
    expect(client.getQueryData(key)).toEqual([]);
    expect(reads).toBe(2);
    expect(errors).toHaveLength(1);
  } finally { unsubscribe(); Object.assign(cartApi, original); client.clear(); }
});

test("cart removal locks rapid calls synchronously and releases the lock after cancellation", async () => {
  const client = new QueryClient();
  const scope = createPrivateScope(1, () => true);
  const original = cartApi.removeFromCart;
  const response = deferred<void>();
  let writes = 0;
  cartApi.removeFromCart = () => { writes++; return response.promise; };
  try {
    const removal = capture(client, scope, useCartItemRemoval);
    removal.handleRemoveItem(1);
    removal.handleRemoveItem(1);
    await expect.poll(() => writes).toBe(1);
    response.reject(new CanceledError());
    await expect.poll(() => client.isMutating()).toBe(0);
    removal.handleRemoveItem(1);
    await expect.poll(() => writes).toBe(2);
  } finally { cartApi.removeFromCart = original; client.clear(); }
});
