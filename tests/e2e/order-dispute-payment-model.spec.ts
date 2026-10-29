import { expect, test } from "@playwright/test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query";
import {
  getDisputePaymentCase, hasDisputePaymentProof, orderApi, orderCasesApi, orderQueryKeys,
  type ListOrdersDto, type OrderCaseDetail, type OrderStatus,
} from "@/entities/order";
import { imageApi } from "@/entities/image";
import { userKeys } from "@/entities/user";
import { useDisputePayment } from "@/features/order-payment/model/useDisputePayment";
import { bindPrivateDataLifecycle } from "@/app/providers/privateDataLifecycle";
import { useAuthStore } from "@/entities/session/model/authStore";
import { createPrivateScope, PrivateScopeContext } from "@/shared/lib/query";
import { ApiError } from "@/shared/lib/errorHandler";
import { authClient, publicClient } from "@/shared/api";

const order = (actualStatus: OrderStatus = "DISPUTED") => ({ orderId: 42, actualStatus, product: { sellerId: 10 } }) as ListOrdersDto;
const detail = (): OrderCaseDetail => ({
  orderCase: { id: 8, orderId: 42, kind: "DISPUTE", state: "OPEN", previousOrderStatus: "AWAITING_PAYMENT" },
  buyerId: 1, sellerId: 10, orderStatus: "DISPUTED", paymentProofImageId: 77, caseImages: [], orderImages: [],
});
const access = { userId: 1, role: "customer" as const, inOwnList: true };

test("availability requires own buyer order and exactly one identified OPEN DISPUTE from AWAITING_PAYMENT", () => {
  expect(getDisputePaymentCase(order(), [detail()], access)).toEqual(detail());
  for (const status of ["BOOKED", "AWAITING_PREPAYMENT", "AWAITING_PREPAYMENT_APPROVAL", "AWAITING_PAYMENT", "ASSEMBLING", "ON_THE_WAY", "COMPLETED", "FAILED", "CANCELLED"] as const)
    expect(getDisputePaymentCase(order(status), [detail()], access)).toBeNull();
  for (const bad of [{ ...access, role: "seller" as const }, { ...access, userId: null }, { ...access, userId: 10 }, { ...access, inOwnList: false }])
    expect(getDisputePaymentCase(order(), [detail()], bad)).toBeNull();
  for (const patch of [{ state: "RESOLVED" }, { kind: "CANCELLATION_REQUEST" }, { kind: "PAYMENT_APPEAL" }, { previousOrderStatus: "ON_THE_WAY" }, { previousOrderStatus: undefined }, { id: undefined }])
    expect(getDisputePaymentCase(order(), [{ ...detail(), orderCase: { ...detail().orderCase, ...patch } } as OrderCaseDetail], access)).toBeNull();
  for (const cases of [[], [detail(), detail()], [{}], [{ ...detail(), buyerId: 2 }], [{ ...detail(), sellerId: 2 }], [{ ...detail(), orderStatus: "FAILED" as const }], [{ ...detail(), orderCase: { ...detail().orderCase, orderId: 43 } }]])
    expect(getDisputePaymentCase(order(), cases, access)).toBeNull();
});

test("recovery matches submitted image in the original dispute, including RESOLVED; upload-only orderImages or status cannot confirm POST", () => {
  expect(hasDisputePaymentProof([{ ...detail(), paymentProofImageId: 101 }], 8, 101)).toBe(true);
  expect(hasDisputePaymentProof([{ ...detail(), caseImages: [101], orderCase: { ...detail().orderCase, state: "RESOLVED" } }], 8, 101)).toBe(true);
  expect(hasDisputePaymentProof([{ ...detail(), orderImages: [101] }], 8, 101)).toBe(false);
  expect(hasDisputePaymentProof([{ ...detail(), caseImages: [101] }], 9, 101)).toBe(false);
  expect(hasDisputePaymentProof([detail()], 8, 101)).toBe(false);
});

test("dispute uses the existing private ASSEMBLING POST with one imageId and encoded comment, without account or JSON", async () => {
  const post = authClient.post, publicPost = publicClient.post;
  authClient.post = (async (url, body) => {
    const parsed = new URL(String(url), "https://fixture.invalid");
    expect(parsed.pathname).toBe("/order/42/ASSEMBLING");
    expect([...parsed.searchParams]).toEqual([["imageId", "101"], ["comment", "Чек & ? = +"]]);
    expect(body).toBeUndefined(); return { data: 42 };
  }) as typeof authClient.post;
  publicClient.post = async () => { throw new Error("Must use authClient"); };
  try { await orderApi.confirmPaymentByCustomer(42, 101, "Чек & ? = +"); }
  finally { authClient.post = post; publicClient.post = publicPost; }
});

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity }, mutations: { retry: 2 } } });
  const scope = createPrivateScope(1, () => true);
  client.setQueryData(scope.key(userKeys.profile()), { id: 1 });
  const capture = (id = 42, available = true) => {
    let hook!: ReturnType<typeof useDisputePayment>;
    function Probe() { hook = useDisputePayment({ ...order(), orderId: id }, [detail()], "customer", available); return null; }
    renderToString(createElement(QueryClientProvider, { client }, createElement(PrivateScopeContext.Provider, { value: scope }, createElement(Probe))));
    return hook;
  };
  const original = { orders: orderApi.getCustomerOrders, cases: orderCasesApi.list, upload: imageApi.saveOrderImage, post: orderApi.confirmPaymentByCustomer };
  const state = { orders: [order()], cases: [detail()], posts: 0, uploads: 0, readsFail: false };
  orderApi.getCustomerOrders = async () => { if (state.readsFail) throw new Error("GET failed"); return state.orders; };
  orderCasesApi.list = async () => { if (state.readsFail) throw new Error("GET failed"); return state.cases; };
  imageApi.saveOrderImage = async () => { state.uploads++; return [101]; };
  orderApi.confirmPaymentByCustomer = async () => { state.posts++; state.cases = [{ ...detail(), caseImages: [101] }]; return 42; };
  const begin = () => {
    const hook = capture(); hook.start(); hook.setComment("Чек & ? = +"); hook.setFile(new File(["png"], "proof.png")); return hook;
  };
  const restore = () => {
    Object.assign(orderApi, { getCustomerOrders: original.orders, confirmPaymentByCustomer: original.post });
    orderCasesApi.list = original.cases; imageApi.saveOrderImage = original.upload; client.clear(); scope.dispose();
  };
  return { client, scope, capture, state, begin, restore };
}

test("one operation survives concurrent instances and pending remount; accepted POST plus failed GET remains accepted and cannot repeat", async () => {
  const ctx = setup(); let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  orderApi.confirmPaymentByCustomer = async () => { ctx.state.posts++; await gate; ctx.state.readsFail = true; return 42; };
  try {
    const first = ctx.begin(); const pending = first.submit();
    await expect.poll(() => ctx.state.posts).toBe(1);
    expect(ctx.capture().state.busy).toBe(true); await ctx.capture().submit(); expect(ctx.state.posts).toBe(1);
    release(); await pending;
    const restored = ctx.capture(); expect(restored.state).toMatchObject({ outcome: "accepted", checked: false, imageId: 101, comment: "Чек & ? = +", busy: false });
    await restored.submit(); expect(ctx.state.posts).toBe(1);
    ctx.state.readsFail = false; ctx.state.cases = [{ ...detail(), caseImages: [101] }]; await restored.checkResult();
    expect(ctx.capture().state.checked).toBe(true); expect(ctx.state.orders[0].actualStatus).toBe("DISPUTED");
    expect(ctx.capture(43).state.imageId).toBeNull(); expect(ctx.state.uploads).toBe(1);
  } finally { release(); ctx.restore(); }
});

for (const failure of [new ApiError("Lost", "NETWORK_ERROR"), new ApiError("Timeout", "TIMEOUT"), new ApiError("Server error", "SERVER_ERROR", 500), new ApiError("Timeout", "TIMEOUT", 408)])
  test(`ambiguous ${failure.code}/${failure.statusCode}: negative GET never authorizes retry; same proof later confirms`, async () => {
    const ctx = setup();
    orderApi.confirmPaymentByCustomer = async () => { ctx.state.posts++; ctx.state.cases[0].orderImages = [101]; throw failure; };
    try {
      await ctx.begin().submit(); expect(ctx.capture().state.outcome).toBe("unknown");
      const restored = ctx.capture(); await restored.checkResult(); await restored.submit(); expect(ctx.state.posts).toBe(1);
      expect(ctx.capture().state.outcome).toBe("unknown");
      ctx.state.orders = [order("FAILED")]; ctx.state.cases = [{ ...detail(), orderStatus: "FAILED", caseImages: [101], orderCase: { ...detail().orderCase, state: "RESOLVED" } }];
      await restored.checkResult(); expect(ctx.capture().state).toMatchObject({ outcome: "accepted", checked: true });
      expect(ctx.state.posts).toBe(1); expect(ctx.state.uploads).toBe(1);
    } finally { ctx.restore(); }
  });

test("known rejection with failed GET blocks retry until fresh read; reuses uploaded image and preserves input", async () => {
  const ctx = setup();
  orderApi.confirmPaymentByCustomer = async () => { ctx.state.posts++; ctx.state.readsFail = true; throw new ApiError("Validation", "INVALID_REQUEST", 400); };
  try {
    await ctx.begin().submit(); expect(ctx.capture().state.outcome).toBe("rejected"); await ctx.capture().submit(); expect(ctx.state.posts).toBe(1);
    ctx.state.readsFail = false; await ctx.capture().checkResult(); expect(ctx.capture().state.outcome).toBe("draft");
    await ctx.capture().submit(); expect(ctx.state.posts).toBe(2); expect(ctx.state.uploads).toBe(1);
  } finally { ctx.restore(); }
});

test("offline operation fails immediately without leaving a queued POST to run after remount or reconnect", async () => {
  const ctx = setup(); const online = onlineManager.isOnline();
  orderApi.confirmPaymentByCustomer = async () => { ctx.state.posts++; throw new ApiError("Offline", "NETWORK_ERROR"); };
  try {
    const hook = ctx.begin(); onlineManager.setOnline(false);
    await hook.submit();
    expect(ctx.capture().state).toMatchObject({ outcome: "unknown", busy: false, imageId: 101 });
    onlineManager.setOnline(true); await ctx.capture().submit(); expect(ctx.state.posts).toBe(1);
  } finally { onlineManager.setOnline(online); ctx.restore(); }
});

test("fresh preflight rejects stale cache, foreign buyer and replaced dispute; resolution during upload prevents POST", async () => {
  const ctx = setup();
  try {
    const hook = ctx.begin(); ctx.client.setQueryData(ctx.scope.key(orderQueryKeys.customerOrders()), [order()]);
    ctx.state.orders = [order("FAILED")]; await hook.submit(); expect(ctx.state.posts).toBe(0); expect(ctx.state.uploads).toBe(0);
    ctx.state.orders = [order()]; ctx.state.cases = [{ ...detail(), buyerId: 999 }]; await hook.submit(); expect(ctx.state.posts).toBe(0);
    ctx.state.cases = [{ ...detail(), orderCase: { ...detail().orderCase, id: 9 } }]; await hook.submit(); expect(ctx.state.uploads).toBe(0);
    ctx.state.cases = [detail()];
    imageApi.saveOrderImage = async () => { ctx.state.uploads++; ctx.state.orders = [order("FAILED")]; ctx.state.cases = [{ ...detail(), orderStatus: "FAILED", orderCase: { ...detail().orderCase, state: "RESOLVED" } }]; return [101]; };
    await hook.submit(); expect(ctx.state.posts).toBe(0); expect(ctx.capture().state.imageId).toBe(101);
  } finally { ctx.restore(); }
});

test("refresh preserves operation; late POST after account teardown cannot recreate private data; unrelated queries stay fresh", async () => {
  const ctx = setup(); const auth = useAuthStore.getState();
  useAuthStore.setState({ isInitialized: true, isAuthenticated: true, accountRevision: 1 });
  const unbind = bindPrivateDataLifecycle(ctx.client, ctx.scope, () => {}, () => {});
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  orderApi.confirmPaymentByCustomer = async () => { ctx.state.posts++; await gate; return 42; };
  try {
    ctx.client.setQueryData(["catalog"], ["unchanged"]);
    const pending = ctx.begin().submit(); await expect.poll(() => ctx.state.posts).toBe(1);
    useAuthStore.setState({ sessionRevision: auth.sessionRevision + 1 }); expect(ctx.capture().state.imageId).toBe(101);
    useAuthStore.setState({ accountRevision: 2 }); release(); await pending;
    expect(ctx.client.getQueryCache().getAll().map(query => query.queryKey)).toEqual([["catalog"]]);
    expect(ctx.client.getQueryState(["catalog"])?.isInvalidated).toBe(false);
  } finally { release(); unbind(); ctx.restore(); useAuthStore.setState(auth, true); }
});
