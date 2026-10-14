import { expect, test } from "@playwright/test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider, QueryObserver } from "@tanstack/react-query";
import { createPrivateScope, PrivateScopeContext } from "@/shared/lib/query";
import { useOrderCreateSubmit } from "@/features/order-create/model/useOrderCreateSubmit";
import { getCheckoutAttempt } from "@/features/order-create/model/checkoutAttempt";
import { orderApi } from "@/entities/order/api/orderApi";
import { cartKeys } from "@/entities/cart/model/queryKeys";
import { cartApi } from "@/entities/cart/api/cartApi";
import { bindCartQuantityProjection } from "@/entities/cart/model/cartQuantityProjection";
import { orderQueryKeys } from "@/entities/order/model/queryKeys";
import { useCartQuantityStore } from "@/entities/cart/model/cartQuantityStore";
import type { ProductBasket } from "@/entities/cart";
import type { OrderCreateCheckoutState } from "@/features/order-create";
import { ApiError } from "@/shared/lib/errorHandler";
import { orderFixture } from "./helpers/mobileAccount";
import { shouldRetryQuery } from "@/shared/lib/query";

function setup() {
  const client = new QueryClient();
  const scope = createPrivateScope(1, () => true);
  const items: ProductBasket[] = [1, 2].map(id => ({
    product: { ...orderFixture(id, "BOOKED", 1).product, id, image: [], availability: "PURCHASABLE", currency: "RUB", status: "ACTIVE" },
    count: 5, availableCount: 10, enoughStock: true,
  }));
  const selected = [...items];
  const state: OrderCreateCheckoutState = {
    selectedAddress: { id: 50 } as OrderCreateCheckoutState["selectedAddress"],
    comment: "Комментарий", isReadyToSubmit: true, getTransferIdForSeller: () => 101,
  };
  const sync = () => {
    client.setQueryData(scope.key(cartKeys.all), [...items]);
    useCartQuantityStore.getState().syncWithServer(items.map(item => ({ productId: item.product.id, count: item.count })));
  };
  useCartQuantityStore.getState().clearQuantities();
  sync();
  let notifications = 0;
  function mount() {
    let hook!: ReturnType<typeof useOrderCreateSubmit>;
    function Probe() {
      hook = useOrderCreateSubmit({ cartItems: selected, checkoutState: state,
        onSuccess: () => notifications++, onPartialSuccess: () => notifications++, onError: () => notifications++ });
      return null;
    }
    renderToString(createElement(QueryClientProvider, { client },
      createElement(PrivateScopeContext.Provider, { value: scope }, createElement(Probe))));
    return hook;
  }
  return { client, scope, items, selected, state, sync, mount, notifications: () => notifications,
    close: () => { scope.dispose(); client.clear(); useCartQuantityStore.getState().clearQuantities(); } };
}

for (const failure of [new ApiError("Timeout", "TIMEOUT"), new ApiError("Server failed", "UNKNOWN", 500), new Error("Lost response")]) {
  test(`unknown result blocks retry, clear and remount: ${failure.message}`, async () => {
    const env = setup();
    const original = orderApi.createOrder;
    let posts = 0;
    orderApi.createOrder = async () => { posts++; throw failure; };
    try {
      const hook = env.mount();
      const result = await hook.handleSubmit();
      expect(result?.failed.map(item => item.status)).toEqual(["unknown", "unknown"]);
      await hook.retryFailed();
      hook.clearResult();
      await hook.handleSubmit();
      await env.mount().handleSubmit();
      env.client.setQueryData(env.scope.key(cartKeys.all), []);
      expect(getCheckoutAttempt(env.scope.signal).getState().uncertain).toBe(true);
      expect(posts).toBe(2);
    } finally { orderApi.createOrder = original; env.close(); }
  });
}

for (const change of ["quantity", "address", "delivery", "selection", "readiness", "comment", "cacheQuantity"] as const) {
  test(`retry checks current ${change} instead of submitting stale payload`, async () => {
    const env = setup();
    const original = orderApi.createOrder;
    let posts = 0;
    orderApi.createOrder = async () => { posts++; throw new ApiError("Отказ", "COUNT_INVALID", 400); };
    try {
      const hook = env.mount();
      await hook.handleSubmit();
      if (change === "quantity") { env.items[0].count = 1; env.sync(); }
      if (change === "cacheQuantity") env.client.setQueryData(env.scope.key(cartKeys.all), env.items.map(item => ({ ...item, count: 1 })));
      if (change === "address") env.state.selectedAddress = null;
      if (change === "delivery") env.state.getTransferIdForSeller = () => 102;
      if (change === "selection") env.selected.pop();
      if (change === "readiness") env.state.isReadyToSubmit = false;
      if (change === "comment") env.state.comment = "Новый комментарий";
      await hook.retryFailed();
      await hook.retryFailed();
      expect(posts).toBe(2);
    } finally { orderApi.createOrder = original; env.close(); }
  });
}

test("only confirmed failed positions retry; successful positions never repeat", async () => {
  const env = setup();
  const original = orderApi.createOrder;
  const posts: number[] = [];
  orderApi.createOrder = async orders => {
    const id = orders[0].productId;
    posts.push(id);
    if (id === 2 && posts.filter(value => value === 2).length === 1) throw new ApiError("Отказ", "COUNT_INVALID", 400);
    return [id];
  };
  try {
    const hook = env.mount();
    const first = await hook.handleSubmit();
    expect(first?.successCount).toBe(1);
    env.sync();
    const retried = await hook.retryFailed();
    expect(retried?.successCount).toBe(2);
    hook.clearResult();
    await hook.handleSubmit();
    expect(posts).toEqual([1, 2, 2]);
  } finally { orderApi.createOrder = original; env.close(); }
});

test("pending survives remount, old scope settlement cannot block the new session", async () => {
  const env = setup();
  const original = orderApi.createOrder;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let posts = 0;
  orderApi.createOrder = async () => { posts++; await gate; throw new Error("Lost response"); };
  try {
    const hook = env.mount();
    const pending = hook.handleSubmit();
    await hook.handleSubmit();
    await env.mount().handleSubmit();
    expect(posts).toBe(2);
    env.scope.dispose();
    const newScope = createPrivateScope(2, () => true);
    release();
    await pending;
    expect(env.notifications()).toBe(0);
    expect(getCheckoutAttempt(newScope.signal).getState()).toEqual({ pending: false, uncertain: false });
    newScope.dispose();
  } finally { release(); orderApi.createOrder = original; env.close(); }
});

for (const failedRead of ["cart", "orders"] as const) {
  test(`confirmed writes survive failed ${failedRead} confirmation and remount without replaying the attempt`, async () => {
    // P08 / FTA-037: api-and-auth.md «Товары и доставка в checkout»:
    // подтверждённый POST не становится unknown из-за ошибки отдельного read;
    // retry прежней попытки не повторяет успешные позиции.
    const env = setup();
    const originals = { createOrder: orderApi.createOrder, getCart: cartApi.getCart,
      getCustomerOrders: orderApi.getCustomerOrders };
    const posts: Parameters<typeof orderApi.createOrder>[0][] = [];
    const gates = [deferredRead(), deferredRead()];
    let failedReads = 0;
    let recover = false;
    const confirmedOrders: Awaited<ReturnType<typeof orderApi.getCustomerOrders>> = env.items.map(item => {
      const order = orderFixture(100 + item.product.id, "BOOKED", 1);
      return { ...order, actualStatus: "BOOKED", product: { ...item.product, count: item.count },
        transfer: { ...order.transfer, currency: item.product.currency },
        histories: [{ status: "BOOKED", comment: "", changedAt: order.createdAt }] };
    });
    const read = async <T,>(snapshot: T): Promise<T> => {
      if (recover) return snapshot;
      const gate = gates[failedReads++];
      if (gate) await gate.promise;
      throw new ApiError("Confirmation read failed", "UNKNOWN", 500);
    };
    orderApi.createOrder = async payload => { posts.push(payload); return [100 + payload[0].productId]; };
    cartApi.getCart = async () => failedRead === "cart" ? read([...env.items]) : [...env.items];
    orderApi.getCustomerOrders = async () => failedRead === "orders" ? read(confirmedOrders) : confirmedOrders;
    const cartKey = env.scope.key(cartKeys.all);
    const ordersKey = env.scope.key(orderQueryKeys.customerOrders());
    env.client.setQueryData(ordersKey, []);
    const unbind = bindCartQuantityProjection(env.client, env.scope);
    const cart = new QueryObserver(env.client, { queryKey: cartKey,
      queryFn: ({ signal }) => cartApi.getCart({ size: 100 }, signal), staleTime: 300_000, retry: 1 });
    const orders = new QueryObserver(env.client, { queryKey: ordersKey,
      queryFn: ({ signal }) => orderApi.getCustomerOrders(signal), staleTime: 120_000, retry: shouldRetryQuery });
    const unsubscribeCart = cart.subscribe(() => undefined);
    const unsubscribeOrders = orders.subscribe(() => undefined);
    try {
      const originalAttempt = env.mount();
      const pending = originalAttempt.handleSubmit();
      await expect.poll(() => failedReads).toBe(1);
      expect(posts).toEqual([1, 2].map(productId => [{
        productId, count: 5, addressId: 50, transferId: 101, comment: "Комментарий",
      }]));
      expect(getCheckoutAttempt(env.scope.signal).getState()).toEqual({ pending: true, uncertain: false });
      expect(env.notifications()).toBe(0);
      await env.mount().handleSubmit();
      expect(posts).toHaveLength(2);
      gates[0].release();
      await expect.poll(() => failedReads).toBe(2);
      expect(env.client.getQueryState(failedRead === "cart" ? cartKey : ordersKey)?.fetchStatus).toBe("fetching");
      await env.mount().handleSubmit();
      expect(posts).toHaveLength(2);
      gates[1].release();
      const result = await pending;
      expect(result).toMatchObject({ totalCount: 2, successCount: 2, failed: [],
        success: [{ productId: 1, status: "success" }, { productId: 2, status: "success" }] });
      expect(env.client.getQueryState(failedRead === "cart" ? cartKey : ordersKey)).toMatchObject({ status: "error", fetchStatus: "idle" });
      expect(getCheckoutAttempt(env.scope.signal).getState()).toEqual({ pending: false, uncertain: false });
      expect(env.notifications()).toBe(1);
      expect(failedReads).toBe(2);
      await originalAttempt.retryFailed();
      await originalAttempt.handleSubmit();
      await env.mount().retryFailed();
      expect(posts).toHaveLength(2);

      // Восстановление перечитывает данные; оно не является новой записью заказа.
      recover = true;
      await Promise.all([cart.refetch(), orders.refetch()]);
      expect(env.client.getQueryState(cartKey)?.status).toBe("success");
      expect(env.client.getQueryData(ordersKey)).toEqual(confirmedOrders);
      expect(useCartQuantityStore.getState().getSyncStatus(1)).toBe("synced");
      await originalAttempt.retryFailed();
      await env.mount().retryFailed();
      expect(posts).toHaveLength(2);
      expect(env.notifications()).toBe(1);

      // Уточнение пользователя для P08 (2026-10-14): отдельное явное
      // оформление после свежего чтения и известного успеха — новый intent.
      const newIntent = await env.mount().handleSubmit();
      expect(newIntent).toMatchObject({ successCount: 2, failed: [] });
      expect(posts).toEqual([1, 2, 1, 2].map(productId => [{
        productId, count: 5, addressId: 50, transferId: 101, comment: "Комментарий",
      }]));
      expect(env.notifications()).toBe(2);
    } finally {
      gates.forEach(gate => gate.release());
      unsubscribeCart(); unsubscribeOrders(); unbind();
      Object.assign(orderApi, { createOrder: originals.createOrder, getCustomerOrders: originals.getCustomerOrders });
      cartApi.getCart = originals.getCart;
      env.close();
    }
  });
}

function deferredRead() {
  let release!: () => void;
  const promise = new Promise<void>(resolve => { release = resolve; });
  return { promise, release };
}
