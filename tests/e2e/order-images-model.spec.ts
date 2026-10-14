import { expect, test } from "@playwright/test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { imageApi, adminImageApi, type ImageResponse, type NonOrderImageTag } from "@/entities/image";
import { useOrderImagesQuery } from "@/entities/image/model/useImageQueries";
import { authClient, publicClient } from "@/shared/api";
import { createPrivateScope, PrivateScopeContext } from "@/shared/lib/query";
import { bindPrivateDataLifecycle } from "@/app/providers/privateDataLifecycle";
import { useAuthStore } from "@/entities/session/model/authStore";

test("ORDER transport uses authClient, signal, entityId and multipart files; generic APIs reject ORDER", async () => {
  const original = { get: authClient.get, post: authClient.post, delete: authClient.delete, publicGet: publicClient.get };
  const reads: string[] = [];
  const uploads: { url: string; body: FormData; signal?: AbortSignal }[] = [];
  const controller = new AbortController();
  let deletes = 0;
  let response: unknown = [17];
  const file = new File(["test"], "proof.png", { type: "image/png" });
  try {
    authClient.get = (async (url, config) => { reads.push(url!); expect(config?.signal).toBe(controller.signal); return { data: [] }; }) as typeof authClient.get;
    publicClient.get = async () => { throw new Error("Public fallback must not run"); };
    authClient.post = (async (url, body, config) => { uploads.push({ url: url!, body: body as FormData, signal: config?.signal as AbortSignal }); return { data: response }; }) as typeof authClient.post;
    authClient.delete = (async () => { deletes++; }) as typeof authClient.delete;
    expect(await imageApi.getOrderImages([7, 7, -1, 1.5], controller.signal)).toEqual([]);
    expect(await adminImageApi.read([8], controller.signal)).toEqual([]);
    expect(reads).toEqual(["/images?ids=7", "/images?ids=8"]);
    expect(await imageApi.saveOrderImage(file, 42, controller.signal)).toEqual([17]);
    expect(uploads[0].url).toBe("/images?tag=ORDER&entityId=42");
    expect(uploads[0].body.get("files")).toBe(file);
    expect(uploads[0].signal).toBe(controller.signal);
    for (const invalid of [[], [null], [0], [-1], [1.5], ["17"], [17, 0]]) {
      response = invalid;
      await expect(imageApi.saveOrderImage(file, 42)).rejects.toThrow("Invalid image upload response");
    }
    const count = uploads.length;
    for (const id of [0, -1, 1.5, NaN]) await expect(imageApi.saveOrderImage(file, id)).rejects.toThrow("Invalid order ID");
    const orderTag = "ORDER" as unknown as NonOrderImageTag;
    await expect(imageApi.saveImage(file, orderTag)).rejects.toThrow("ORDER images");
    await expect(imageApi.deleteImages([17], orderTag)).rejects.toThrow("ORDER images");
    expect(uploads).toHaveLength(count);
    expect(deletes).toBe(0);
    const canDeleteOrder: "ORDER" extends Parameters<typeof imageApi.deleteImages>[1] ? true : false = false;
    const canUploadUnboundOrder: "ORDER" extends Parameters<typeof imageApi.saveImage>[1] ? true : false = false;
    expect([canDeleteOrder, canUploadUnboundOrder]).toEqual([false, false]);
  } finally {
    authClient.get = original.get; authClient.post = original.post; authClient.delete = original.delete; publicClient.get = original.publicGet;
  }
});

test("real ORDER query is private, aborts late reads on account switch, and preserves public cache", async () => {
  const initial = useAuthStore.getState();
  const original = imageApi.getOrderImages;
  const client = new QueryClient();
  useAuthStore.setState({ isInitialized: true, isAuthenticated: true, accountRevision: 1 });
  const scope = createPrivateScope(1, () => useAuthStore.getState().accountRevision === 1);
  const unbind = bindPrivateDataLifecycle(client, scope, () => {}, () => {});
  let resolve!: (images: ImageResponse[]) => void;
  let signal: AbortSignal | undefined;
  let hook!: ReturnType<typeof useOrderImagesQuery>;
  function Probe() { hook = useOrderImagesQuery(42, [9, 9, 3, 0]); return null; }
  imageApi.getOrderImages = (_, abortSignal) => { signal = abortSignal; return new Promise(done => { resolve = done; }); };
  try {
    renderToString(createElement(QueryClientProvider, { client }, createElement(PrivateScopeContext.Provider, { value: scope }, createElement(Probe))));
    expect(client.getQueryCache().getAll().map(query => query.queryKey)).toEqual([["private", 1, "orderImages", 42, 3, 9]]);
    client.setQueryData(scope.key(["orderImages", 41, 9]), [{ fileName: "A", contentType: "image/png", imageData: "private-A" }]);
    client.setQueryData(["imageMetadata", 3], [{ id: 3 }]);
    client.setQueryData(["admin", 1, "images", [9]], [{ imageData: "A" }]);
    const pending = hook.refetch();
    await expect.poll(() => !!signal).toBe(true);
    useAuthStore.setState({ sessionRevision: initial.sessionRevision + 1 });
    expect(signal?.aborted).toBe(false);
    expect(client.getQueryData(scope.key(["orderImages", 41, 9]))).toEqual([{ fileName: "A", contentType: "image/png", imageData: "private-A" }]);
    useAuthStore.setState({ accountRevision: 2 });
    expect(signal?.aborted).toBe(true);
    resolve([{ fileName: "A", contentType: "image/png", imageData: "private-A" }]);
    await pending;
    expect(client.getQueryCache().getAll().map(query => query.queryKey)).toEqual([["imageMetadata", 3]]);
    expect(scope.isCurrent()).toBe(false);
  } finally { unbind(); client.clear(); imageApi.getOrderImages = original; useAuthStore.setState(initial, true); }
});
