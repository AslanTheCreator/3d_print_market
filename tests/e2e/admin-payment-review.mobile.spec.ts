import { expect, test } from "@playwright/test";
import { adminReviewFixture } from "./helpers/adminPaymentReview";
import { expectNoOverflow } from "./helpers/mobileAccount";

test("ADMIN reviews the selected agent receipt on mobile", async ({ page, baseURL }) => {
  const { dialog, posts, checkbox, approve, check } = await adminReviewFixture(page, baseURL, false, true);
  await expect(dialog.getByAltText("Текущий чек №77")).toBeVisible();
  await expectNoOverflow(page);
  await checkbox.check(); await approve.click();
  await expect(check).toBeVisible();
  expect(posts).toEqual(["/admin/actions/agents/2/orders/201/payments/review/approve"]);
});

test("mobile ADMIN returns a prepayment from the global queue", async ({ page, baseURL }) => {
  const { state, dialog, posts, reason, sendBack, check, apply } = await adminReviewFixture(page, baseURL, true);
  await reason.fill("  Нечитаемая дата  "); await sendBack.click();
  await expect(check).toBeVisible();
  expect(state.writes).toEqual([{ path: "/admin/actions/agents/2/orders/201/payments/review/return",
    method: "POST", body: { expectedVersion: 0, reason: "Нечитаемая дата" }, search: "" }]);
  apply("return", "Нечитаемая дата");
  await check.click();
  await expect(dialog.getByText("Решение подтверждено историей заказа.")).toBeVisible();
  expect(posts).toHaveLength(1);
});
