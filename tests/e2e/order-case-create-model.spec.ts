import { expect, test } from "@playwright/test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getAvailableOrderCaseKinds, orderApi, orderCasesApi, orderQueryKeys, type CreateOrderCaseRequest, type ListOrdersDto, type OrderCaseDetail, type OrderCaseKind, type OrderStatus } from "@/entities/order";
import { userKeys } from "@/entities/user";
import { authClient, publicClient } from "@/shared/api";
import { ApiError } from "@/shared/lib/errorHandler";
import { createPrivateScope, PrivateScopeContext } from "@/shared/lib/query";
import { getOrderCaseFailure, hasCreatedOrderCase } from "@/features/order-case-create/model/result";
import { useOrderCaseCreate } from "@/features/order-case-create/model/useOrderCaseCreate";
import { bindPrivateDataLifecycle } from "@/app/providers/privateDataLifecycle";
import { useAuthStore } from "@/entities/session/model/authStore";
import { imageApi } from "@/entities/image";

const order = (actualStatus: OrderStatus = "AWAITING_PAYMENT", proof: number | null | undefined = null, prepaymentAmount: number | null = 0) => ({
  orderId: 42, actualStatus, paymentProofImageId: proof, prepaymentAmount, images: [88], product: { sellerId: 10 },
}) as ListOrdersDto;
const access = { userId: 1, role: "customer" as const, inOwnList: true };
const detail = (kind: OrderCaseKind = "DISPUTE", state: "OPEN" | "RESOLVED" = "OPEN"): OrderCaseDetail => ({ orderCase: { id: 8, orderId: 42, kind, state, openingComment: "Причина & ? = +", openedBy: 1 } });
const statuses: OrderStatus[] = ["BOOKED", "AWAITING_PREPAYMENT", "AWAITING_PREPAYMENT_APPROVAL", "AWAITING_PAYMENT", "ASSEMBLING", "ON_THE_WAY", "DISPUTED", "COMPLETED", "FAILED", "CANCELLED"];

// @ts-expect-error cancellation-request does not accept imageIds
const invalidCancellation: CreateOrderCaseRequest = { orderId: 42, kind: "CANCELLATION_REQUEST", comment: "Reason", imageIds: [1] };
void invalidCancellation;

test("B1/B2: exhaustive status/role/proof/prepayment matrix, first case and unknown proof", () => {
  for (const role of ["customer", "seller"] as const) for (const status of statuses) for (const proof of [undefined, null, 77, 0]) for (const prepayment of [undefined, null, 0, 50]) {
    const subject = { ...order(status, proof), prepaymentAmount: prepayment } as ListOrdersDto;
    // Passing undefined explicitly must preserve an absent legacy field.
    subject.paymentProofImageId = proof;
    const expected: OrderCaseKind[] = [];
    if (proof === null && (status === "AWAITING_PREPAYMENT" || (status === "AWAITING_PAYMENT" && (prepayment === null || prepayment === 0)))) expected.push("CANCELLATION_REQUEST");
    if (proof === 77 && ["AWAITING_PREPAYMENT_APPROVAL", "AWAITING_PAYMENT", "ASSEMBLING", "ON_THE_WAY"].includes(status)) expected.push("DISPUTE");
    if (role === "customer" && status === "CANCELLED") expected.push("PAYMENT_APPEAL");
    expect(getAvailableOrderCaseKinds(subject, [], { ...access, role, userId: role === "seller" ? 10 : 1 })).toEqual(expected);
  }
});

test("OPEN of any kind/state, previous resolved appeal, role ownership and sparse cases fail closed", () => {
  for (const kind of ["DISPUTE", "CANCELLATION_REQUEST", "PAYMENT_APPEAL", "FUTURE"])
    expect(getAvailableOrderCaseKinds(order(), [{ orderCase: { kind, state: "OPEN" } }], access)).toEqual([]);
  expect(getAvailableOrderCaseKinds(order("CANCELLED"), [detail("PAYMENT_APPEAL", "RESOLVED")], access)).toEqual([]);
  expect(getAvailableOrderCaseKinds(order("CANCELLED"), [detail("DISPUTE", "RESOLVED")], access)).toEqual(["PAYMENT_APPEAL"]);
  for (const wrong of [{ ...access, userId: null }, { ...access, inOwnList: false }, { ...access, userId: 10 }, { ...access, role: "seller" as const }]) expect(getAvailableOrderCaseKinds(order(), [], wrong)).toEqual([]);
  for (const item of [{}, { orderCase: {} }, { ...detail("DISPUTE", "RESOLVED"), buyerId: 999 }, { orderCase: { orderId: 999, state: "RESOLVED" as const } }]) expect(getAvailableOrderCaseKinds(order(), [item], access)).toEqual([]);
});

test("three exact private POST contracts encode unicode/comment and repeated imageIds without JSON or brackets", async () => {
  const original = { post: authClient.post, publicPost: publicClient.post };
  const requests: CreateOrderCaseRequest[] = [
    { orderId: 42, kind: "CANCELLATION_REQUEST", comment: " Причина & ? = + " },
    { orderId: 42, kind: "DISPUTE", comment: "Причина & ? = +", imageIds: [7, 9] },
    { orderId: 42, kind: "PAYMENT_APPEAL", comment: "Причина & ? = +" },
  ];
  const paths = ["/order/42/cancellation-request", "/order/orders/42/DISPUTED", "/order/42/payment-appeal"];
  let calls = 0;
  authClient.post = (async (url, body) => {
    const parsed = new URL(String(url), "https://fixture.invalid");
    expect(parsed.pathname).toBe(paths[calls]); expect(parsed.searchParams.get("comment")).toBe("Причина & ? = +");
    expect(parsed.searchParams.getAll("imageIds")).toEqual(calls === 1 ? ["7", "9"] : []);
    expect(parsed.searchParams.has("imageIds[]")).toBe(false); expect(body).toBeUndefined(); calls++; return { data: null };
  }) as typeof authClient.post;
  publicClient.post = async () => { throw new Error("Private writes must not use publicClient"); };
  try {
    for (const request of requests) await orderCasesApi.create(request);
    await expect(orderCasesApi.create({ ...requests[0], comment: "   " })).rejects.toThrow();
    await expect(orderCasesApi.create({ ...requests[0], imageIds: [7] } as unknown as CreateOrderCaseRequest)).rejects.toThrow();
    await expect(orderCasesApi.create({ orderId: 42, kind: "DISPUTE", comment: "Reason", imageIds: [0] })).rejects.toThrow();
    expect(calls).toBe(3);
  } finally { authClient.post = original.post; publicClient.post = original.publicPost; }
});

test("N1 classifies code independently of generic 400/409; only new matching history confirms unknown POST", () => {
  const cases = [detail()];
  expect(hasCreatedOrderCase(cases, [], "DISPUTE", "Причина & ? = +", 1)).toBe(true);
  for (const [ids, kind, comment, user] of [[[8], "DISPUTE", "Причина & ? = +", 1], [[], "PAYMENT_APPEAL", "Причина & ? = +", 1], [[], "DISPUTE", "Other", 1], [[], "DISPUTE", "Причина & ? = +", 2]] as const)
    expect(hasCreatedOrderCase(cases, ids, kind, comment, user)).toBe(false);
  const messages = new Set(["ORDER_CASE_ALREADY_OPEN", "PAYMENT_APPEAL_ALREADY_EXISTS", "ORDER_CASE_INVALID_TRANSITION", "BAD_REQUEST", "INVALID_REQUEST"].map(code => getOrderCaseFailure(new ApiError("Server error", code, code.includes("ALREADY") ? 409 : 400)).message));
  expect(messages.size).toBe(5);
  expect(getOrderCaseFailure(new ApiError("Generic conflict", "UNKNOWN", 409))).toEqual({ outcome: "rejected", message: "Generic conflict" });
  for (const status of [undefined, 408, 500]) expect(getOrderCaseFailure(new ApiError("Lost", undefined, status)).outcome).toBe("unknown");
});

function capture(client: QueryClient, scope: ReturnType<typeof createPrivateScope>, orderId = 42) {
  let hook!: ReturnType<typeof useOrderCaseCreate>;
  function Probe() { hook = useOrderCaseCreate(orderId, "customer", true); return null; }
  renderToString(createElement(QueryClientProvider, { client }, createElement(PrivateScopeContext.Provider, { value: scope }, createElement(Probe))));
  return hook;
}
function setup() {
  const client = new QueryClient(); const scope = createPrivateScope(1, () => true);
  client.setQueryData(scope.key(userKeys.profile()), { id: 1 });
  return { client, scope };
}

test("real workflow retains partial uploads across remount and does not repeat successful evidence uploads", async () => {
  const { client, scope } = setup(); const original = { list: orderCasesApi.list, orders: orderApi.getCustomerOrders, create: orderCasesApi.create, upload: imageApi.saveOrderImage };
  let uploads = 0, posts = 0; let cases: OrderCaseDetail[] = [];
  orderApi.getCustomerOrders = async () => [order("AWAITING_PAYMENT", 77)]; orderCasesApi.list = async () => cases;
  imageApi.saveOrderImage = async () => { uploads++; if (uploads === 2) throw new Error("Upload failed"); return [uploads + 100]; };
  orderCasesApi.create = async request => { posts++; expect(request.imageIds).toEqual([101, 103]); cases = [detail()]; };
  try {
    const first = capture(client, scope); first.select("DISPUTE"); first.addFiles([new File(["a"], "a.png"), new File(["b"], "b.png")]);
    await first.submit("Причина & ? = +"); expect(uploads).toBe(2); expect(posts).toBe(0);
    const restored = capture(client, scope); expect(restored.state.files[0].imageIds).toEqual([101]);
    await restored.submit("Причина & ? = +"); expect(uploads).toBe(3); expect(posts).toBe(1);
    expect(capture(client, scope).state.outcome).toBe("accepted");
  } finally { Object.assign(orderCasesApi, { list: original.list, create: original.create }); orderApi.getCustomerOrders = original.orders; imageApi.saveOrderImage = original.upload; client.clear(); scope.dispose(); }
});

test("shared busy/unknown guard blocks duplicate submits after remount; GET without new case never proves rejection", async () => {
  const { client, scope } = setup(); const original = { list: orderCasesApi.list, orders: orderApi.getCustomerOrders, create: orderCasesApi.create };
  let posts = 0; let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  orderApi.getCustomerOrders = async () => [order()]; orderCasesApi.list = async () => [];
  orderCasesApi.create = async () => { posts++; await gate; throw new ApiError("Lost", "NETWORK_ERROR"); };
  try {
    const first = capture(client, scope); first.select("CANCELLATION_REQUEST");
    const pending = first.submit("Причина & ? = +"); await expect.poll(() => posts).toBe(1);
    await capture(client, scope).submit("Duplicate"); expect(posts).toBe(1);
    release(); await pending;
    const restored = capture(client, scope); expect(restored.state.outcome).toBe("unknown");
    await restored.checkResult(); await restored.submit("Duplicate"); expect(posts).toBe(1);
    expect(capture(client, scope, 43).state.comment).toBe("");
    orderCasesApi.list = async () => [detail("CANCELLATION_REQUEST")]; await restored.checkResult();
    expect(capture(client, scope).state.outcome).toBe("accepted");
  } finally { Object.assign(orderCasesApi, { list: original.list, create: original.create }); orderApi.getCustomerOrders = original.orders; client.clear(); scope.dispose(); }
});

test("stale successful cache and foreign ownership cannot authorize POST; a late old-scope result cannot recreate private state", async () => {
  const { client, scope } = setup(); const initial = useAuthStore.getState();
  const original = { list: orderCasesApi.list, orders: orderApi.getCustomerOrders, create: orderCasesApi.create };
  let posts = 0; let fresh = order("BOOKED"); let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  orderApi.getCustomerOrders = async () => [fresh]; orderCasesApi.list = async () => [];
  orderCasesApi.create = async () => { posts++; await gate; };
  client.setQueryData(scope.key(orderQueryKeys.customerOrders()), [order()]);
  useAuthStore.setState({ isInitialized: true, isAuthenticated: true, accountRevision: 1 });
  const unbind = bindPrivateDataLifecycle(client, scope, () => {}, () => {});
  try {
    const hook = capture(client, scope); hook.select("CANCELLATION_REQUEST"); await hook.submit("Reason"); expect(posts).toBe(0);
    fresh = { ...order(), product: { sellerId: 1 } } as ListOrdersDto; await hook.submit("Reason"); expect(posts).toBe(0);
    fresh = order(); const pending = hook.submit("Reason"); await expect.poll(() => posts).toBe(1);
    useAuthStore.setState({ sessionRevision: initial.sessionRevision + 1 }); expect(scope.signal.aborted).toBe(false);
    useAuthStore.setState({ accountRevision: 2 }); release(); await pending;
    expect(client.getQueryCache().getAll().filter(query => query.queryKey[0] === "private")).toEqual([]);
  } finally { unbind(); Object.assign(orderCasesApi, { list: original.list, create: original.create }); orderApi.getCustomerOrders = original.orders; client.clear(); scope.dispose(); useAuthStore.setState(initial, true); }
});

test("missing baseline IDs never let an old matching case prove success after an unknown POST", async () => {
  const { client, scope } = setup(); const original = { list: orderCasesApi.list, orders: orderApi.getCustomerOrders, create: orderCasesApi.create };
  let cases: OrderCaseDetail[] = [{ orderCase: { kind: "CANCELLATION_REQUEST", state: "RESOLVED", openedBy: 1, openingComment: "Old reason" } }];
  orderApi.getCustomerOrders = async () => [order()]; orderCasesApi.list = async () => cases;
  orderCasesApi.create = async () => { cases = [{ orderCase: { ...cases[0].orderCase, id: 8 } }]; throw new ApiError("Lost", "NETWORK_ERROR"); };
  try {
    const hook = capture(client, scope); hook.select("CANCELLATION_REQUEST"); await hook.submit("Old reason");
    expect(capture(client, scope).state.outcome).toBe("unknown");
    await capture(client, scope).checkResult(); expect(capture(client, scope).state.outcome).toBe("unknown");
  } finally { Object.assign(orderCasesApi, { list: original.list, create: original.create }); orderApi.getCustomerOrders = original.orders; client.clear(); scope.dispose(); }
});

test("known rejection with failed GET blocks POST until explicit successful read, then permits explicit retry", async () => {
  const { client, scope } = setup(); const original = { list: orderCasesApi.list, orders: orderApi.getCustomerOrders, create: orderCasesApi.create };
  let posts = 0, readFailure = false;
  orderApi.getCustomerOrders = async () => [order()]; orderCasesApi.list = async () => { if (readFailure) throw new Error("GET unavailable"); return []; };
  orderCasesApi.create = async () => { posts++; readFailure = true; throw new ApiError("Invalid", "INVALID_REQUEST", 400); };
  try {
    const hook = capture(client, scope); hook.select("CANCELLATION_REQUEST"); await hook.submit("Saved reason");
    expect(capture(client, scope).state.outcome).toBe("rejected"); await hook.submit("Duplicate"); expect(posts).toBe(1);
    readFailure = false; await hook.checkResult(); expect(capture(client, scope).state.outcome).toBe("draft");
    await hook.submit("Saved reason"); expect(posts).toBe(2);
  } finally { Object.assign(orderCasesApi, { list: original.list, create: original.create }); orderApi.getCustomerOrders = original.orders; client.clear(); scope.dispose(); }
});
