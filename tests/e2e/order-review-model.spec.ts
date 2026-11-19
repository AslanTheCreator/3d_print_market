import { expect, test } from "@playwright/test";
import { getOrderReviewState, type OrderStatus } from "@/entities/order";
import { resolveReviewCheck, type ReviewRecovery } from "@/widgets/orders/model/orderReviewRecovery";

const statuses: OrderStatus[] = [
  "BOOKED", "AWAITING_PREPAYMENT", "AWAITING_PREPAYMENT_APPROVAL", "AWAITING_PAYMENT",
  "ASSEMBLING", "ON_THE_WAY", "DISPUTED", "COMPLETED", "CANCELLED", "FAILED",
];

for (const role of ["customer", "seller", "admin"] as const) {
  for (const actualStatus of statuses) {
    test(`review access for ${role} in ${actualStatus}`, () => {
      const buyer = role === "customer";
      const terminal = actualStatus === "COMPLETED" || actualStatus === "FAILED";
      const cases = [
        [null, true, buyer && terminal ? "available" : "unavailable"],
        [null, false, "unavailable"],
        [null, undefined, "unavailable"],
        [702, true, "published"],
        [702, false, "published"],
        [702, undefined, "published"],
        [undefined, true, "unavailable"],
        [undefined, false, "unavailable"],
        [undefined, undefined, buyer && actualStatus === "COMPLETED" ? "available" : "unavailable"],
      ] as const;

      for (const [reviewId, canLeaveReview, expected] of cases) {
        const order = {
          actualStatus,
          ...(reviewId !== undefined && { reviewId }),
          ...(canLeaveReview !== undefined && { canLeaveReview }),
        };
        expect(getOrderReviewState(order, role), JSON.stringify(order)).toBe(expected);
      }
    });
  }
}

test("control results preserve evidence, recover explicit eligibility and fail closed on old DTOs", () => {
  const legacy = { actualStatus: "COMPLETED" } as const;
  const available = { ...legacy, canLeaveReview: true, reviewId: null };
  const denied = { ...available, canLeaveReview: false };
  const published = { ...denied, reviewId: 702 };
  const recovery = (reason: ReviewRecovery["reason"]): ReviewRecovery => ({ reason, previousOrder: available });
  for (const reason of ["accepted", "duplicate", "not-terminated"] as const) {
    expect(resolveReviewCheck(available, recovery(reason), false)).toBe("needs-check");
    expect(resolveReviewCheck(available, recovery(reason), true)).toBe("idle");
    expect(resolveReviewCheck({ ...available, actualStatus: "FAILED" }, recovery(reason), false)).toBe("idle");
    expect(resolveReviewCheck(denied, recovery(reason), false)).toBe("idle");
  }
  expect(resolveReviewCheck(published, recovery("unknown"), false)).toBe("idle");
  expect(resolveReviewCheck(available, recovery("unknown"), false)).toBe("idle");
  expect(resolveReviewCheck({ ...legacy, canLeaveReview: true }, recovery("unknown"), true)).toBe("needs-check");
  expect(resolveReviewCheck(legacy, recovery("unknown"), true)).toBe("needs-check");
  expect(resolveReviewCheck(undefined, recovery("unknown"), true)).toBe("needs-check");
  expect(resolveReviewCheck(legacy, recovery("accepted"), false)).toBe("legacy-published");
});
