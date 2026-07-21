import { expect, test } from "@playwright/test";
import {
  shouldShowPaymentProofForRole,
  shouldShowTrackingForRole,
  type ListOrdersModel,
} from "@/entities/order";
import {
  getSafeTrackingUrl,
  sortOrderHistories,
} from "@/widgets/orders/model/orderDetails";

type OrderHistory = ListOrdersModel["histories"][number];

const history = (
  status: OrderHistory["status"],
  changedAt: string,
): OrderHistory => ({
  status,
  changedAt,
  comment: status,
});

test.describe("order details model", () => {
  test("allows only absolute HTTP tracking links", () => {
    expect(getSafeTrackingUrl(" https://tracking.example/order/42 ")).toBe(
      "https://tracking.example/order/42",
    );
    expect(getSafeTrackingUrl("http://tracking.example/order/42")).toBe(
      "http://tracking.example/order/42",
    );
    expect(getSafeTrackingUrl("javascript:alert(1)")).toBeNull();
    expect(getSafeTrackingUrl("/track/42")).toBeNull();
    expect(getSafeTrackingUrl("not a url")).toBeNull();
    expect(getSafeTrackingUrl("   ")).toBeNull();
  });

  test("sorts history chronologically and keeps invalid dates stable at the end", () => {
    const invalidFirst = history("FAILED", "invalid-first");
    const invalidSecond = history("DISPUTED", "invalid-second");
    const booked = history("BOOKED", "2026-07-17T08:00:00.000Z");
    const assembling = history(
      "ASSEMBLING",
      "2026-07-17T10:00:00.000Z",
    );

    expect(
      sortOrderHistories([
        invalidFirst,
        assembling,
        invalidSecond,
        booked,
      ]),
    ).toEqual([booked, assembling, invalidFirst, invalidSecond]);
  });

  test("keeps payment proof and tracking private to the intended role", () => {
    expect(
      shouldShowPaymentProofForRole(
        "AWAITING_PREPAYMENT_APPROVAL",
        "seller",
      ),
    ).toBe(true);
    expect(
      shouldShowPaymentProofForRole(
        "AWAITING_PREPAYMENT_APPROVAL",
        "customer",
      ),
    ).toBe(false);
    expect(shouldShowTrackingForRole("ON_THE_WAY", "customer")).toBe(true);
    expect(shouldShowTrackingForRole("ON_THE_WAY", "seller")).toBe(false);
    expect(shouldShowTrackingForRole("ASSEMBLING", "customer")).toBe(false);
  });
});
