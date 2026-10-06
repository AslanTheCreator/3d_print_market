import { expect, test } from "@playwright/test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createPrivateScope, PrivateScopeContext } from "@/shared/lib/query";
import { useOrderCreateSubmit } from "@/features/order-create/model/useOrderCreateSubmit";
import { getCheckoutAttempt } from "@/features/order-create/model/checkoutAttempt";
import { orderApi } from "@/entities/order/api/orderApi";
import { cartKeys } from "@/entities/cart/model/queryKeys";
import { useCartQuantityStore } from "@/entities/cart/model/cartQuantityStore";
import type { ProductBasket } from "@/entities/cart";
import type { OrderCreateCheckoutState } from "@/features/order-create";
import { ApiError } from "@/shared/lib/errorHandler";
import { orderFixture } from "./helpers/mobileAccount";

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
