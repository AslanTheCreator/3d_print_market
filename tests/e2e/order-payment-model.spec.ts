import { expect, test } from "@playwright/test";
import {
  getOrderPaymentBreakdown,
  hasOrderPrepayment,
  getOrderProgressSteps,
  shouldShowOrderProgress,
  type ListOrdersModel,
} from "@/entities/order";

import { decodeOrderTermsEvents } from "@/entities/order/lib/orderTermsHistory";
import { lastEventId, latestReturn, paymentEvidence, sameProofCycle } from "@/features/order-payment/model/paymentEvidence";
import { orderCalculation } from "./helpers/orderCalculation";

const scenarios = [
  { name: "regular order", availability: "PURCHASABLE", count: 3, prepaymentAmount: 0, totalPrice: 3_600 },
  { name: "single preorder", availability: "PREORDER", count: 1, prepaymentAmount: 250, totalPrice: 750 },
  { name: "fractional server amounts remain unchanged for multiple units", availability: "PREORDER", count: 3, prepaymentAmount: 750.75, totalPrice: 3001.5 },
  { name: "preorder quantity does not multiply the server amount", availability: "PREORDER", count: 3, prepaymentAmount: 500, totalPrice: 1_500 },
  { name: "external product with prepayment", availability: "EXTERNAL_PRODUCT", count: 3, prepaymentAmount: 700, totalPrice: 2_300 },
  { name: "external product without prepayment despite a stale product amount", availability: "EXTERNAL_PRODUCT", count: 2, prepaymentAmount: 0, totalPrice: 2_000 },
  { name: "preorder without prepayment", availability: "PREORDER", count: 2, prepaymentAmount: 0, totalPrice: 2_000 },
] as const;

for (const scenario of scenarios) {
  test(scenario.name, () => {
    const order = {
      totalPrice: scenario.totalPrice,
      prepaymentAmount: scenario.prepaymentAmount,
      product: {
        availability: scenario.availability,
        count: scenario.count,
        price: 9_999,
        prepaymentAmount: 999,
      },
    } as ListOrdersModel;

    const legacy = getOrderPaymentBreakdown(order);
    expect(legacy.paymentBlock).toBe("Актуальный расчёт не получен");
    const calculation = getOrderPaymentBreakdown({ ...order, calculation: orderCalculation(), termsVersion: 0 });
    expect(calculation.amounts).toEqual({ goodsAmount: "4000.00", deliveryAmount: "500.00", totalAmount: "4500.00", confirmedPaidAmount: "1000.00", remainingAmount: "3500.00" });
    expect(calculation.paymentBlock).toBeNull();
    const hasPrepayment = hasOrderPrepayment(order);
    expect(hasPrepayment).toBe(scenario.prepaymentAmount > 0);
    const statuses = getOrderProgressSteps(hasPrepayment).map((step) => step.key);
    expect(statuses.includes("AWAITING_PREPAYMENT")).toBe(hasPrepayment);
    expect(statuses.includes("AWAITING_PREPAYMENT_APPROVAL")).toBe(hasPrepayment);
    expect(shouldShowOrderProgress(
      hasPrepayment ? "AWAITING_PREPAYMENT" : "AWAITING_PAYMENT",
      hasPrepayment,
    )).toBe(true);
  });
}

test("missing, unknown, partial and malformed calculations remain distinct", () => {
  const read = (changes: Parameters<typeof orderCalculation>[0], version: number | null = 0) =>
    getOrderPaymentBreakdown({ calculation: orderCalculation(changes), termsVersion: version });
  expect(read({ known: false }).prepaymentBlock).toContain("сверка");
  expect(read({ deliveryAmount: null, totalAmount: null, remainingAmount: null }).prepaymentBlock).toBeNull();
  expect(read({ deliveryAmount: null, totalAmount: null, remainingAmount: null }).paymentBlock).toContain("неизвестен");
  expect(read({ deliveryAmount: "0.00" }).format("deliveryAmount")).toMatch(/^0,00/);
  expect(read({ confirmedPaidAmount: "4500.00", remainingAmount: "0.00" }).paymentBlock).toContain("не требуется");
  expect(read({ confirmedPaidAmount: null, remainingAmount: null }).format("totalAmount")).toMatch(/4\s500,00/);
  for (const value of [42, "4.001", "-1", "4e3", ""]) {
    const invalid = read({ goodsAmount: value as string });
    expect(invalid.prepaymentBlock).toBeTruthy();
    expect(invalid.format("goodsAmount")).toBeNull();
    expect(invalid.format("confirmedPaidAmount")).toBeTruthy();
    expect(invalid.amounts.totalAmount).toBe("4500.00");
    expect(invalid.amounts.remainingAmount).toBe("3500.00");
    expect(invalid.paymentBlock).toBeTruthy();
  }
  expect(read({ deliveryAmount: null }).format("totalAmount")).toBeNull();
  expect(read({ currency: "CREATE" }).paymentBlock).toBeTruthy();
  expect(read({ scale: -1 }).paymentBlock).toBeTruthy();
  for (const termsVersion of [null, undefined, -1, Number.MAX_SAFE_INTEGER + 1]) {
    const result = getOrderPaymentBreakdown({ calculation: orderCalculation(), termsVersion });
    expect(result.prepaymentBlock).toContain("Версия");
    expect(result.format("remainingAmount")).toMatch(/3\s500,00/);
  }
});

test("server balances are compared at the declared scale without rounding", () => {
  for (const [totalAmount, remainingAmount, exceeds] of [
    ["4500.00", "35000.00", true],
    ["0.00", "0.01", true],
    ["9007199254740993.01", "9007199254740993.02", true],
    ["9007199254740993.01", "9007199254740993.01", false],
  ] as const) {
    const result = getOrderPaymentBreakdown({ termsVersion: 0, calculation: orderCalculation({
      goodsAmount: totalAmount, deliveryAmount: "0.00", totalAmount, confirmedPaidAmount: "0.00", remainingAmount,
    }) });
    expect(result.amounts.totalAmount).toBe(totalAmount);
    expect(result.deliveryLabel).toBe("Бесплатно");
    if (exceeds) {
      expect(result.prepaymentBlock).toContain("превышает итог заказа");
      expect(result.paymentBlock).toBe(result.message);
      expect(result.format("remainingAmount")).toBeNull();
    } else {
      expect(result.paymentBlock).toBeNull();
      expect(result.amounts.remainingAmount).toBe(remainingAmount);
    }
  }
  const read = (changes: Parameters<typeof orderCalculation>[0]) =>
    getOrderPaymentBreakdown({ calculation: orderCalculation(changes), termsVersion: 0 });
  expect(read({ confirmedPaidAmount: "4500.01" }).paymentBlock).toBeTruthy();
  expect(read({ remainingAmount: "3500.01" }).format("remainingAmount")).toBeNull();
  expect(read({ goodsAmount: undefined }).paymentBlock).toContain("формат");
  const partial = read({ goodsAmount: null });
  expect(partial.amounts.totalAmount).toBe("4500.00");
  expect(partial.amounts.remainingAmount).toBe("3500.00");
  expect(partial.paymentBlock).toBeNull();
});

test("неопределённый POST требует новой однозначной цепочки именно этого чека", () => {
  const pending = { actualStatus: "AWAITING_PAYMENT_APPROVAL", termsVersion: 1, paymentProofImageId: 44 } as const;
  const submission = { id: 12, actor_id: 7, kind: "PAYMENT_SUBMITTED", payload: '{"expectedVersion":0,"imageId":44}' };
  const review = { id: 13, actor_id: 89, kind: "PAYMENT_RETURNED", payload: '{"request":{"expectedVersion":1,"reason":"Нечёткое фото"},"imageId":44,"confirmedPaidAmount":"0.00"}' };
  const decode = (rows: unknown[]) => decodeOrderTermsEvents(JSON.stringify(rows));
  const check = (rows: unknown[], baseline?: number) => paymentEvidence(pending, decode(rows), "full", 0, 44, 7, baseline);
  expect(lastEventId(undefined)).toBeUndefined();
  expect(lastEventId([])).toBe(0);
  expect(check([submission])).toBe(false);
  expect(check([submission], 12)).toBe(false);
  expect(check([submission], 11)).toBe("pending");
  for (const invalid of [{ actor_id: 8 }, { id: 0 }, { payload: '{"expectedVersion":0,"imageId":44.0000000000000000001}' },
    { payload: '{"expectedVersion":1,"imageId":44}' }]) expect(check([{ ...submission, ...invalid }], 11)).toBe(false);
  expect(check([submission, { ...submission, id: 13 }], 11)).toBe(false);
  expect(check([submission, submission], 11)).toBe(false);
  const returned = { ...pending, termsVersion: 2, actualStatus: "AWAITING_PAYMENT" } as const;
  expect(paymentEvidence(returned, decode([review, submission]), "full", 0, 44, 7, 11)).toBe("returned");
  expect(paymentEvidence(returned, decode([submission, review]), "prepayment", 0, 44, 7, 11)).toBe(false);
  expect(latestReturn(decode([review, submission]), returned, "full", 7)?.reason).toBe("Нечёткое фото");
  expect(latestReturn(decode([{ ...review, payload: "{}" }]), returned, "full", 7)).toBeUndefined();
});

test("сверка всех переходов от исходного чека до независимо прочитанной версии заказа", () => {
  const event = (id: number, kind: string, version: number, imageId: number) => ({
    id, kind, actor_id: kind === "PAYMENT_SUBMITTED" ? 7 : 15,
    payload: JSON.stringify(kind === "DELIVERY_CHANGED"
      ? { before: { deliveryAmount: null }, after: { expectedVersion: version, deliveryAmount: "1.00" } }
      : kind === "PAYMENT_SUBMITTED" ? { expectedVersion: version, imageId }
      : { request: { expectedVersion: version, reason: "Возврат " + imageId }, imageId, confirmedPaidAmount: "0.00" }),
  });
  const rows = [
    event(10, "PAYMENT_SUBMITTED", 0, 77), event(16, "PAYMENT_RETURNED", 1, 77),
    event(17, "PAYMENT_SUBMITTED", 2, 88), event(21, "PAYMENT_RETURNED", 3, 88),
    event(26, "DELIVERY_CHANGED", 4, 0), event(27, "PAYMENT_SUBMITTED", 5, 99),
    event(29, "PAYMENT_APPROVED", 6, 99), event(33, "PAYMENT_SUBMITTED", 7, 100),
    event(38, "PAYMENT_RETURNED", 8, 100),
  ];
  const decode = (events: unknown[]) => decodeOrderTermsEvents(JSON.stringify(events));
  const ready = { termsVersion: 4, actualStatus: "AWAITING_PREPAYMENT" } as const;
  const full = { termsVersion: 9, actualStatus: "AWAITING_PAYMENT" } as const;
  expect(paymentEvidence(ready, decode(rows.slice(0, 4)), "prepayment", 0, 77, 7, 0)).toBe("returned");
  expect(latestReturn(decode(rows.slice(0, 4)), ready, "prepayment", 7)?.reason).toBe("Возврат 88");
  expect(latestReturn(decode(rows.slice(0, 4)), full, "full", 7)).toBeUndefined();
  expect(paymentEvidence(full, decode(rows), "prepayment", 0, 77, 7, 0)).toBe("returned");
  expect(latestReturn(decode(rows), full, "full", 7)?.reason).toBe("Возврат 100");
  expect(paymentEvidence(full, decode(rows), "prepayment", 5, 99, 7, 26)).toBe("approved");
  // Перед POST список уже вернул версию 5, а история ещё не содержала изменения доставки на версии 4.
  expect(paymentEvidence(full, decode(rows), "prepayment", 5, 99, 7, 21)).toBe("approved");
  const conflicting = [...rows, event(30, "PAYMENT_SUBMITTED", 5, 99)];
  expect(paymentEvidence(full, decode(conflicting), "prepayment", 5, 99, 7, 21)).toBe(false);
  for (const invalid of [rows.slice(0, -1), rows.filter(row => row.id !== 26),
    [...rows, rows[0]], rows.map(row => row.id === 26 ? { ...row, payload: "{}" } : row),
    rows.map(row => row.id === 21 ? event(21, "PAYMENT_RETURNED", 3, 77) : row)]) {
    expect(paymentEvidence(full, decode(invalid), "prepayment", 0, 77, 7, 0)).toBe(false);
  }
  for (const termsVersion of [2.5, "2", null, undefined, -1, Number.MAX_SAFE_INTEGER + 1]) {
    expect(paymentEvidence({ ...ready, termsVersion: termsVersion as number }, decode(rows.slice(0, 2)), "prepayment", 0, 77, 7, 0)).toBe(false);
  }
  expect(sameProofCycle(decode(rows.slice(0, 4)), 0, 4)).toBe(false);
  expect(sameProofCycle(decode([event(10, "DELIVERY_CHANGED", 0, 0), event(12, "DELIVERY_CHANGED", 1, 0)]), 0, 2)).toBe(true);
});

test("exact three-amount invariant preserves partial and inconsistent server data", () => {
  for (const [currency, scale, totalAmount, confirmedPaidAmount, remainingAmount, valid] of [
    ["RUB", 2, "4500.00", "1000.00", "3500.00", true],
    ["RUB", 2, "4500.00", "1000.00", "2500.00", false],
    ["JPY", 0, "0", "0", "0", true],
    ["USD", 3, "9007199254740993.003", "9007199254740993.001", "0.002", true],
    ["USD", 3, "9007199254740993.003", "9007199254740993.001", "0.001", false],
  ] as const) {
    const calculation = orderCalculation({ currency, scale, totalAmount, confirmedPaidAmount, remainingAmount });
    const breakdown = getOrderPaymentBreakdown({ calculation, termsVersion: 0 });
    expect(breakdown.prepaymentBlock === null).toBe(valid);
    expect(breakdown.amounts.remainingAmount).toBe(remainingAmount);
  }
});
