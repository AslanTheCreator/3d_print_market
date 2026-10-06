import { expect, test } from "@playwright/test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createPrivateScope, PrivateScopeContext } from "@/shared/lib/query";
import { useUpdateProduct, useDeleteProduct, useExtendProductExpiration } from "@/entities/product/model/useProductMutations";
import { productApi } from "@/entities/product/api/productApi";
import { productKeys } from "@/entities/product/model/queryKeys";
import { useUpdateUser } from "@/entities/user/model/useUserMutations";
import { userApi } from "@/entities/user/api/userApi";
import { userKeys } from "@/entities/user/model/queryKeys";
import { imageApi } from "@/entities/image";
import { useImageCleanup } from "@/features/image-upload";

function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const scope = createPrivateScope(1, () => true);
  const capture = <T,>(hook: () => T): T => {
    let result!: T;
    function Probe() { result = hook(); return null; }
    renderToString(createElement(QueryClientProvider, { client },
      createElement(PrivateScopeContext.Provider, { value: scope }, createElement(Probe))));
    return result;
  };
  return { client, scope, capture, close: () => { scope.dispose(); client.clear(); } };
}

const productData = { name: "Сохранён", description: "Описание", price: 100, prepaymentAmount: 0, categoryIds: [2], count: 2, currency: "RUB", originality: "ORIGINAL", availability: "PURCHASABLE", imageIds: [33] } as const;
const userData = { login: "saved", fullName: "Сохранён", phoneNumber: "", imageId: null, deadlineSending: 0, deadlinePayment: 0 };

test("confirmed product PUT invalidates every representation even if separate cleanup fails", async () => {
  const env = setup();
  const original = { update: productApi.updateProduct, delete: imageApi.deleteImages };
  let puts = 0, deletes = 0;
  productApi.updateProduct = async () => { puts++; };
  imageApi.deleteImages = async () => { deletes++; throw new Error("cleanup failed"); };
  const keys = [productKeys.catalog(null), productKeys.catalog(1), productKeys.detail(42), env.scope.key(productKeys.userLists())];
  try {
    keys.forEach(key => env.client.setQueryData(key, { name: "Старый" }));
    await env.capture(useUpdateProduct).mutateAsync({ productId: 42, data: { ...productData, categoryIds: [2], imageIds: [33] } });
    expect(deletes).toBe(0);
    expect(env.client.getMutationCache().getAll()[0].state.status).toBe("success");
    keys.forEach(key => expect(env.client.getQueryState(key)?.isInvalidated).toBe(true));
    expect(await env.capture(() => useImageCleanup("PRODUCT")).cleanup([11])).toBe(false);
    expect(puts).toBe(1);
    expect(deletes).toBe(1);
    expect(env.client.getMutationCache().getAll()[0].state.status).toBe("success");
  } finally { productApi.updateProduct = original.update; imageApi.deleteImages = original.delete; env.close(); }
});

for (const fails of [false, true]) {
  test(`profile PUT ${fails ? "failure rolls back" : "success survives cleanup failure"}`, async () => {
    const env = setup();
    const original = { update: userApi.updateUser, delete: imageApi.deleteImages };
    let puts = 0, deletes = 0;
    userApi.updateUser = async () => { puts++; if (fails) throw new Error("PUT failed"); return 1; };
    imageApi.deleteImages = async () => { deletes++; throw new Error("DELETE failed"); };
    const keys = [env.scope.key(userKeys.current()), env.scope.key(userKeys.profile())];
    try {
      keys.forEach(key => env.client.setQueryData(key, { login: "old", fullName: "Старый", imageId: 77, image: [] }));
      const mutation = env.capture(useUpdateUser);
      if (fails) await expect(mutation.mutateAsync({ userData })).rejects.toThrow("PUT failed");
      else {
        await mutation.mutateAsync({ userData });
        expect(deletes).toBe(0);
        expect(await env.capture(() => useImageCleanup("PARTICIPANT")).cleanup([77])).toBe(false);
      }
      keys.forEach(key => {
        expect(env.client.getQueryData(key)).toMatchObject({ login: fails ? "old" : "saved" });
        expect(env.client.getQueryState(key)?.isInvalidated).toBe(true);
      });
      expect(puts).toBe(1);
      expect(deletes).toBe(fails ? 0 : 1);
    } finally { userApi.updateUser = original.update; imageApi.deleteImages = original.delete; env.close(); }
  });
}

test("cleanup retries only failed IDs, prevents overlapping retry and stops after scope disposal", async () => {
  const env = setup();
  const original = imageApi.deleteImages;
  const calls: number[][] = [];
  let fails = true;
  imageApi.deleteImages = async ids => { calls.push(ids); if (ids[0] === 22 && fails) throw new Error("DELETE failed"); };
  try {
    const hook = env.capture(() => useImageCleanup("PRODUCT"));
    expect(await hook.cleanup([11, 22, 33, 11])).toBe(false);
    fails = false;
    const firstRetry = hook.retry();
    expect(await hook.retry()).toBe(false);
    expect(await firstRetry).toBe(true);
    expect(calls).toEqual([[11], [22], [33], [22]]);
    env.scope.dispose();
    expect(await hook.cleanup([44])).toBe(false);
    expect(calls).toHaveLength(4);
  } finally { imageApi.deleteImages = original; env.close(); }
});

for (const action of ["delete", "extend"] as const) {
  for (const fails of [false, true]) {
    test(`${action} ${fails ? "failure preserves" : "success invalidates"} catalog, own list and detail`, async () => {
      const env = setup();
      const apiKey = action === "delete" ? "deleteProduct" : "extendProductExpiration";
      const original = productApi[apiKey];
      productApi[apiKey] = async () => { if (fails) throw new Error("write failed"); };
      const keys = [productKeys.catalog(null), productKeys.catalog(1), productKeys.list({ name: "test" }), productKeys.detail(42), env.scope.key(productKeys.userLists())];
      try {
        keys.forEach(key => env.client.setQueryData(key, [{ id: 42 }]));
        const mutation = env.capture(action === "delete" ? useDeleteProduct : useExtendProductExpiration);
        if (fails) await expect(mutation.mutateAsync(42)).rejects.toThrow("write failed");
        else await mutation.mutateAsync(42);
        keys.forEach(key => {
          expect(env.client.getQueryState(key)?.isInvalidated).toBe(!fails);
          expect(env.client.getQueryData(key)).toEqual([{ id: 42 }]);
        });
      } finally { productApi[apiKey] = original; env.close(); }
    });
  }
}
