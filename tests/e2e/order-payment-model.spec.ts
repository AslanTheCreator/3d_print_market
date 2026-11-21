import { expect, test } from "@playwright/test";
import {
  getOrderPaymentBreakdown,
  hasOrderPrepayment,
  getOrderProgressSteps,
  shouldShowOrderProgress,
  type ListOrdersModel,
} from "@/entities/order";

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
  expect(read({ remainingAmount: "0.00" }).paymentBlock).toContain("не требуется");
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
