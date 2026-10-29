import { expect, test } from "@playwright/test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getOrderCaseImageGroups, orderCasesApi, useOrderCasesQuery, type OrderCaseDetail, type ListOrdersDto } from "@/entities/order";
import { getSafeCaseTelegramUrl } from "@/entities/order/ui/OrderCaseCard";
import { authClient, publicClient } from "@/shared/api";
import { createPrivateScope, PrivateScopeContext } from "@/shared/lib/query";
import { bindPrivateDataLifecycle } from "@/app/providers/privateDataLifecycle";
import { useAuthStore } from "@/entities/session/model/authStore";

test("cases use authClient, exact path and AbortSignal, preserve B2/N2 sparse data and reject foreign/malformed responses", async () => {
  const original = { get: authClient.get, publicGet: publicClient.get };
  const controller = new AbortController(); let response: unknown = [{ currency: "USD", paymentProofImageId: null, orderCase: { orderId: 42, kind: "UNKNOWN", state: "OPEN" } }, {}];
  authClient.get = (async (url, config) => { expect(url).toBe("/order/42/cases"); expect(config?.signal).toBe(controller.signal); return { data: response }; }) as typeof authClient.get;
  publicClient.get = async () => { throw new Error("Private cases must never use publicClient"); };
  try {
    const result = await orderCasesApi.list(42, controller.signal);
    expect(result).toEqual(response); expect(result[0].currency).toBe("USD");
    expect(result[0].paymentProofImageId).toBeNull(); expect(result[1].paymentProofImageId).toBeUndefined();
    const legacy: Pick<ListOrdersDto, "images" | "paymentProofImageId"> = { images: [] };
    expect(legacy.paymentProofImageId).toBeUndefined();
    for (const invalid of [null, {}, [{ orderCase: { orderId: 43 } }]]) {
      response = invalid; await expect(orderCasesApi.list(42, controller.signal)).rejects.toThrow("Некорректный ответ");
    }
  } finally { authClient.get = original.get; publicClient.get = original.publicGet; }
});

test("image groups deduplicate order unions, select only known positive proofs, and keep case associations", () => {
  const result = getOrderCaseImageGroups({ images: [7, 3, 7, 9], paymentProofImageId: 9 }, [
    { orderImages: [7, 5, 9, 5], paymentProofImageId: 9, caseImages: [8, 9, 8] },
    { orderImages: [7, 3], paymentProofImageId: 12, caseImages: [9, 12, 4] },
  ]);
  expect(result).toEqual({ proofIds: [9, 12], orderImageIds: [7, 3, 5], cases: [{ imageIds: [8], proofIds: [9] }, { imageIds: [4], proofIds: [12, 9] }] });
  expect(getOrderCaseImageGroups({ images: [7], paymentProofImageId: null }, [{ paymentProofImageId: null, caseImages: [9] }])).toEqual({ proofIds: [], orderImageIds: [7], cases: [{ imageIds: [9], proofIds: [] }] });
  for (const url of ["javascript:alert(1)", "http://t.me/a", "https://t.me.evil.invalid/a", "https://user:password@t.me/a", "https://t.me", "https://example.org/a"]) expect(getSafeCaseTelegramUrl(url)).toBeNull();
  expect(getSafeCaseTelegramUrl("https://telegram.me/discussion")).toBe("https://telegram.me/discussion");
});

test("real cases query isolates orders/accounts, cancels late reads and retains scope on token refresh", async () => {
  const initial = useAuthStore.getState(); const original = orderCasesApi.list;
  const client = new QueryClient();
  useAuthStore.setState({ isInitialized: true, isAuthenticated: true, accountRevision: 1 });
  const scope = createPrivateScope(1, () => useAuthStore.getState().accountRevision === 1);
  const unbind = bindPrivateDataLifecycle(client, scope, () => {}, () => {});
  let hook!: ReturnType<typeof useOrderCasesQuery>;
  let signal!: AbortSignal; let finish!: (value: OrderCaseDetail[]) => void;
  orderCasesApi.list = (_, requestSignal) => { signal = requestSignal!; return new Promise(resolve => { finish = resolve; }); };
  function Probe() { hook = useOrderCasesQuery(42); return null; }
  try {
    renderToString(createElement(QueryClientProvider, { client }, createElement(PrivateScopeContext.Provider, { value: scope }, createElement(Probe))));
    expect(client.getQueryCache().getAll().map(query => query.queryKey)).toEqual([["private", 1, "orders", "cases", 42]]);
    const pending = hook.refetch(); await expect.poll(() => !!signal).toBe(true);
    client.setQueryData(["imageMetadata", 9], [{ id: 9 }]);
    useAuthStore.setState({ sessionRevision: initial.sessionRevision + 1 }); expect(signal.aborted).toBe(false);
    useAuthStore.setState({ accountRevision: 2 }); expect(signal.aborted).toBe(true);
    client.setQueryData(["private", 2, "orders", "cases", 42], [{ orderCase: { openingComment: "Account B" } }]);
    finish([{ orderCase: { openingComment: "Late account A" } }]); await pending;
    expect(client.getQueryData(["private", 1, "orders", "cases", 42])).toBeUndefined();
    expect(client.getQueryData(["private", 2, "orders", "cases", 42])).toEqual([{ orderCase: { openingComment: "Account B" } }]);
    expect(client.getQueryData(["private", 2, "orders", "cases", 43])).toBeUndefined();
    expect(client.getQueryData(["imageMetadata", 9])).toEqual([{ id: 9 }]);
    const query = client.getQueryCache().find({ queryKey: ["private", 2, "orders", "cases", 42] }); expect(query).toBeDefined();
  } finally { unbind(); client.clear(); orderCasesApi.list = original; useAuthStore.setState(initial, true); }
});
