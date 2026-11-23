import { expect, test } from "@playwright/test";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { adminOrderCaseKeys, adminOrderStatuses, casesAllowDelivery, editableDeliveryStatus,
  hasTermsVersion, knownOpenAdminCase, normalizeDeliveryAmount } from "@/entities/order";
import { decodeTermsHistory } from "@/entities/order/lib/orderTermsHistory";
import { createPrivateScope } from "@/shared/lib/query";
import { deliveryAttemptState } from "@/features/order-delivery-terms/model/deliveryTermsAttempt";
import { invalidateDeliveryReads, orderQueryKeys, orderTermsApi } from "@/entities/order";
import { authClient } from "@/shared/api";

test("повреждённый сосед не скрывает корректные события", () => {
  const valid = { kind: "DELIVERY_CHANGED", payload: '{"after":{"deliveryAmount":"12345678901234567.89"}}' };
  const rows = decodeTermsHistory([{ ...valid, id: 1 }, null, {}, { ...valid, id: 2 }]);
  expect(rows.map(row => [row.id, row.after.amount])).toEqual([[1, "12345678901234567.89"], [2, "12345678901234567.89"]]);
  expect(() => decodeTermsHistory({})).toThrow();
});

test("смена заказа и сессии во время refetch отделяет историю и денежные попытки", async () => {
  const client = new QueryClient();
  const first = createPrivateScope(1, () => true);
  const second = createPrivateScope(2, () => true);
  const history = first.key(orderQueryKeys.termsHistory(43));
  const otherOrder = first.key(orderQueryKeys.termsHistory(44));
  const otherSession = second.key(orderQueryKeys.termsHistory(43));
  const payment = first.key(["customerPaymentAttempt", 43, "payment"]);
  client.setQueryData(payment, { phase: "unknown" });
  client.setQueryData(otherOrder, ["заказ 44"]);
  client.setQueryData(otherSession, ["сессия B"]);
  client.setQueryData(history, ["прежнее событие"]);
  let finish!: (events: string[]) => void;
  let signal: AbortSignal | undefined;
  const observer = new QueryObserver(client, { queryKey: history, staleTime: Infinity, queryFn: context => {
    signal = context.signal;
    return new Promise<string[]>(resolve => { finish = resolve; });
  } });
  const off = observer.subscribe(() => {});
  const refresh = invalidateDeliveryReads(client, first, 43, { role: "admin", agentId: 2 }, 0);
  await expect.poll(() => !!signal).toBe(true);
  off();
  first.dispose();
  expect(signal?.aborted).toBe(true);
  finish(["запоздавший ответ"]);
  await refresh;
  expect(client.getQueryData(otherOrder)).toEqual(["заказ 44"]);
  expect(client.getQueryData(otherSession)).toEqual(["сессия B"]);
  expect(client.getQueryData(payment)).toEqual({ phase: "unknown" });
  client.clear();
});

test("некорректный agentId отвергается до транспорта для обоих методов", async () => {
  let calls = 0;
  const previous = authClient.defaults.adapter;
  authClient.defaults.adapter = async () => { calls++; throw Error("Запрос дошёл до транспорта"); };
  try {
    for (const agentId of [undefined, null, 0, -1, 2.5, Number.MAX_SAFE_INTEGER + 1]) {
      const context = { role: "admin" as const, agentId: agentId as number };
      const signal = new AbortController().signal;
      await expect(orderTermsApi.history(context, 43, signal)).rejects.toThrow("номер агента");
      await expect(orderTermsApi.update(context, 43, { expectedVersion: 0, carrier: "YANDEX", address: "ПВЗ", deliveryAmount: null }, signal)).rejects.toThrow("номер агента");
    }
    expect(calls).toBe(0);
  } finally {
    authClient.defaults.adapter = previous;
  }
});

test("чтение 100 заказов, защита незавершённой попытки и конечный срок завершённой", () => {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 30_000 } } });
  const scope = createPrivateScope(1, () => true);
  const store = (id: number) => deliveryAttemptState(client, scope, id, { role: "seller" });
  for (let id = 1; id <= 100; id++) {
    const view = store(id);
    const off = view.subscribe(() => {});
    expect(view.read()).toBeUndefined();
    off();
  }
  expect(client.getQueryCache().getAll()).toHaveLength(0);
  const attempt = { phase: "pending" as const, busy: true, message: "", version: 0 };
  store(1).write(attempt);
  expect(store(1).read()).toEqual(attempt);
  store(1).write({ ...attempt, phase: "unknown", busy: false });
  expect(client.getQueryCache().getAll()[0].gcTime).toBe(Infinity);
  expect(store(1).read()?.phase).toBe("unknown");
  store(1).write({ ...attempt, phase: "idle", busy: false });
  expect(client.getQueryCache().getAll()[0].gcTime).toBe(30_000);
  scope.dispose();
  client.clear();
  store(1).write(attempt);
  expect(client.getQueryCache().getAll()).toHaveLength(0);
});

test("редактируемые статусы, версия ноль и точность ввода", () => {
  expect(adminOrderStatuses.filter(editableDeliveryStatus).sort()).toEqual(["AWAITING_PAYMENT", "AWAITING_PREPAYMENT", "BOOKED"]);
  expect([0, 1, -1, null, undefined, 1.2, Number.MAX_SAFE_INTEGER + 1].map(hasTermsVersion)).toEqual([true,true,false,false,false,false,false]);
  expect(["0", "000,2", "500.00", "12345678901234567.89", "", "1.234", "-1", "1e2", "123456789012345678"].map(normalizeDeliveryAmount))
    .toEqual(["0.00","0.20","500.00","12345678901234567.89",undefined,undefined,undefined,undefined,undefined]);
  expect(casesAllowDelivery([], 1)).toBe(true);
  for (const row of [{}, { orderId: 1, state: "OPEN" as const }, { orderId: 2, state: "RESOLVED" as const }])
    expect(casesAllowDelivery([{ orderCase: row }], 1)).toBe(false);
});

test("история сохраняет исходные цифры, отличает null, ноль и повреждённое событие", () => {
  const event = (payload: string) => ({ id: 7, actor_id: 8, kind: "DELIVERY_CHANGED", payload });
  const rows = decodeTermsHistory([event('{"before":{"deliveryAmount":12345678901234567.89},"after":{"deliveryAmount":"0.00","reason":"ПВЗ"}}'),
    event('{"before":{"deliveryAmount":null},"after":{"deliveryAmount":1.234}}'), event("не JSON"), {kind:"PAYMENT_SUBMITTED"}]);
  expect(rows.map(row => [row.before.amount, row.after.amount])).toEqual([["12345678901234567.89","0.00"],[null,undefined],[undefined,undefined]]);
  expect(rows[0]).toMatchObject({ actor: 8, reason: "ПВЗ" });
});

test("достоверное OPEN ограничено заказом и сессией, более новая деталь отменяет старое свидетельство", async () => {
  const cache = new QueryClient();
  const list = adminOrderCaseKeys.list(7, "OPEN", 2);
  cache.setQueryData(list, [{ caseId: 9, orderId: 42, state: "OPEN" }], { updatedAt: 1 });
  expect(knownOpenAdminCase(cache, 7, 3, 42)).toBe(9);
  expect(knownOpenAdminCase(cache, 8, 3, 42)).toBeUndefined();
  expect(knownOpenAdminCase(cache, 7, 3, 41)).toBeUndefined();
  cache.setQueryData(adminOrderCaseKeys.detail(7, 9), { sellerId: 3, orderCase: { id: 9, orderId: 42, state: "RESOLVED" } }, { updatedAt: 2 });
  expect(knownOpenAdminCase(cache, 7, 3, 42)).toBeUndefined();
  await cache.invalidateQueries({ queryKey: list });
  expect(knownOpenAdminCase(cache, 7, 4, 42)).toBeUndefined();
  cache.clear();
});

test("движок без reviver.source не выдаёт округлённое число за стоимость", () => {
  const parse = JSON.parse;
  try {
    JSON.parse = (text, reviver) => parse(text, reviver && function (key, value) {
      return reviver.call(this, key, value);
    });
    const [event] = decodeTermsHistory([{kind:"DELIVERY_CHANGED",
      payload:'{"before":{"deliveryAmount":12345678901234567.89},"after":{"deliveryAmount":"12345678901234567.89"}}'}]);
    expect(event.before.amount).toBeUndefined();
    expect(event.after.amount).toBe("12345678901234567.89");
    expect(event.incomplete).toBe(true);
  } finally {
    JSON.parse = parse;
  }
});
