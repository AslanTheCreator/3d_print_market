import { expect, test } from "@playwright/test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createPrivateScope, PrivateScopeContext } from "@/shared/lib/query";
import { defaultProductFormValues, productApi, useCreateProduct, useUpdateProduct } from "@/entities/product";
import { createProductFormSubmitHandler } from "@/widgets/create-product-form/model/productFormSubmit";
import { createProductFormSubmission } from "@/widgets/create-product-form/model/productFormSubmission";
import { clearProductFormDraft, getProductFormDraftRevision, readProductFormDraft, writeProductFormDraft } from "@/widgets/create-product-form/model/productFormDraft";

const values = () => ({ ...defaultProductFormValues, categoryIds: [2], name: "Товар", price: "100.25", count: "2" });
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
};
function setup(edit: boolean) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const scope = createPrivateScope(1, () => true);
  const submission = createProductFormSubmission();
  const state = { ready: true, busy: false, created: 0, saved: 0, navigations: 0, notifications: 0, cleanup: Promise.resolve(), snapshot: values(), removed: [] as number[] };
  let mutations!: { create: ReturnType<typeof useCreateProduct>; update: ReturnType<typeof useUpdateProduct> };
  function Probe() { mutations = { create: useCreateProduct(), update: useUpdateProduct() }; return null; }
  renderToString(createElement(QueryClientProvider, { client }, createElement(PrivateScopeContext.Provider, { value: scope }, createElement(Probe))));
  const ids = [77], removed = [22];
  const handler = () => createProductFormSubmitHandler({
    submission, isCurrentScope: scope.isCurrent, isReadyForSubmit: () => state.ready,
    onBusyChange: busy => { state.busy = busy; },
    createProduct: mutations.create.mutateAsync, updateProduct: mutations.update.mutateAsync,
    isEditMode: edit, productId: edit ? "42" : undefined, editTargetId: edit ? 42 : undefined,
    effectiveImageIds: ids, imageIdsToDelete: removed, isProductReadOnly: false,
    hasSellerAccount: true, hasSellerTransfer: true, hasSellerSocialNetwork: true,
    onProductCreated: (_snapshot, revision) => { state.created++; clearProductFormDraft(revision); },
    onProductSaved: async (snapshot, _ids, deleted) => { state.saved++; state.snapshot = snapshot; state.removed = deleted; await state.cleanup; },
    showNotification: () => { state.notifications++; }, navigateToProductList: () => { state.navigations++; },
  });
  return { state, ids, removed, scope, submission, handler, close: () => { submission.dispose(); scope.dispose(); client.clear(); } };
}

for (const edit of [false, true]) test(`${edit ? "PUT" : "POST"} synchronous lock survives handler recreation and waits for settlement`, async () => {
  const gate = deferred(), cleanup = deferred();
  const original = { create: productApi.createProduct, update: productApi.updateProduct };
  const payloads: unknown[] = [];
  productApi.createProduct = async input => { payloads.push(input); await gate.promise; };
  productApi.updateProduct = async (_id, input) => { payloads.push(input); await gate.promise; };
  const env = setup(edit);
  env.state.cleanup = cleanup.promise;
  const form = values();
  try {
    let settled = false;
    const pending = env.handler()(form).then(() => { settled = true; });
    await env.handler()(form);
    expect(env.state.busy).toBe(true);
    form.categoryIds.push(3); env.ids.push(88); env.removed.push(33);
    await expect.poll(() => payloads.length).toBe(1);
    expect(payloads[0]).toMatchObject({ categoryIds: [2], imageIds: [77] });
    expect(settled).toBe(false);
    gate.resolve();
    if (edit) {
      await expect.poll(() => env.state.saved).toBe(1);
      expect(env.state.snapshot.categoryIds).toEqual([2]);
      expect(env.state.removed).toEqual([22]);
      expect(settled).toBe(false);
    }
    cleanup.resolve(); await pending;
    await env.handler()(values());
    expect(payloads).toHaveLength(1);
    expect(env.state.busy).toBe(false);
  } finally { gate.resolve(); cleanup.resolve(); productApi.createProduct = original.create; productApi.updateProduct = original.update; env.close(); }
});

for (const edit of [false, true]) test(`${edit ? "edit" : "create"} rechecks readiness and unlocks after failed write`, async () => {
  const original = { create: productApi.createProduct, update: productApi.updateProduct };
  let writes = 0;
  const fail = async () => { writes++; throw new Error("Mock rejection"); };
  productApi.createProduct = fail; productApi.updateProduct = fail;
  const env = setup(edit);
  try {
    const oldHandler = env.handler();
    env.state.ready = false; await oldHandler(values()); expect(writes).toBe(0);
    env.state.ready = true; await oldHandler(values());
    expect(env.state.busy).toBe(false); expect(env.state.created + env.state.saved).toBe(0);
    await env.handler()(values()); expect(writes).toBe(2);
    expect(env.state.notifications).toBe(2);
  } finally { productApi.createProduct = original.create; productApi.updateProduct = original.update; env.close(); }
});

test("disposed form ignores late success and old redirect timer", async () => {
  const gate = deferred();
  const original = productApi.createProduct;
  let writes = 0;
  productApi.createProduct = async () => { writes++; await gate.promise; };
  const env = setup(false);
  try {
    const pending = env.handler()(values());
    await expect.poll(() => writes).toBe(1);
    env.submission.dispose(); gate.resolve(); await pending;
    expect(env.state.created).toBe(0); expect(env.state.notifications).toBe(0);
    const next = createProductFormSubmission();
    const operation = next.start()!;
    next.schedule(operation, () => { env.state.navigations++; });
    next.dispose();
    await new Promise(resolve => setTimeout(resolve, 1600));
    expect(env.state.navigations).toBe(0);
  } finally { gate.resolve(); productApi.createProduct = original; env.close(); }
});

test("confirmed create cannot clear a newer draft revision", () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  } } });
  try {
    writeProductFormDraft({ values: values(), imageIds: [77], images: [] }, 1);
    const submitted = getProductFormDraftRevision();
    writeProductFormDraft({ values: values(), imageIds: [77], images: [] }, 1);
    expect(getProductFormDraftRevision()).toBe(submitted);
    writeProductFormDraft({ values: { ...values(), name: "Новый черновик" }, imageIds: [88], images: [] }, 1);
    clearProductFormDraft(submitted);
    expect(readProductFormDraft(1)?.values.name).toBe("Новый черновик");
    expect(readProductFormDraft(1)?.imageIds).toEqual([88]);
  } finally {
    clearProductFormDraft();
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
