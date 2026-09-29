import { expect, test } from "@playwright/test";
import {
  getOrderPaymentBreakdown,
  getOrderProgressSteps,
  shouldShowOrderProgress,
  type ListOrdersModel,
} from "@/entities/order";

const scenarios = [
  { name: "regular order", availability: "PURCHASABLE", count: 3, prepaymentAmount: 0, totalPrice: 3_600 },
  { name: "single preorder", availability: "PREORDER", count: 1, prepaymentAmount: 250, totalPrice: 750 },
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

    const result = getOrderPaymentBreakdown(order);
    expect(result).toEqual({
      hasPrepayment: scenario.prepaymentAmount > 0,
      quantity: scenario.count,
      prepaymentTotal: scenario.prepaymentAmount,
      remainingTotal: scenario.totalPrice,
      productTotal: scenario.prepaymentAmount + scenario.totalPrice,
    });
    const statuses = getOrderProgressSteps(result.hasPrepayment).map((step) => step.key);
    expect(statuses.includes("AWAITING_PREPAYMENT")).toBe(result.hasPrepayment);
    expect(statuses.includes("AWAITING_PREPAYMENT_APPROVAL")).toBe(result.hasPrepayment);
    expect(shouldShowOrderProgress(
      result.hasPrepayment ? "AWAITING_PREPAYMENT" : "AWAITING_PAYMENT",
      result.hasPrepayment,
    )).toBe(true);
  });
}
