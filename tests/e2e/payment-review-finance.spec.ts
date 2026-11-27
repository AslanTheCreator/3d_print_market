import { expect, test, type Page } from "@playwright/test";
import { adminReviewFixture } from "./helpers/adminPaymentReview";
import { reviewFixture } from "./helpers/sellerPaymentReview";

async function openReview(role: "seller" | "admin", page: Page, baseURL: string | undefined, prepayment: boolean, status = 503) {
  if (role === "seller") {
    const result = await reviewFixture(page, baseURL, prepayment, undefined, true);
    const { fixture } = result;
    fixture.responseStatus = status;
    return { ...result, order: fixture.order, history: fixture.history, posts: fixture.posts };
  }
  const result = await adminReviewFixture(page, baseURL, prepayment);
  result.state.actionStatus = status;
  return { ...result, history: result.state.reviewHistory[201] };
}

for (const role of ["seller", "admin"] as const) {
  for (const action of ["approve", "return"] as const) {
    test(role + " prevents " + action + " when only the historical paid amount changed", async ({ page, baseURL }) => {
      const { order, history, posts, dialog, checkbox, approve, sendBack, reason } = await openReview(role, page, baseURL, false);
      const imageId = order.paymentProofImageId!;
      const payment = (amount: string) => JSON.stringify({ imageId, confirmedPaidAmount: amount, request: { expectedVersion: 0, reason: "Чек" } });
      history.push({ id: 8, actor_id: 1, kind: "PAYMENT_RETURNED", payload: payment("1000") },
        { id: 9, actor_id: order.userInfo.id, kind: "PAYMENT_SUBMITTED", payload: JSON.stringify({ expectedVersion: 1, imageId }) });
      order.termsVersion = 2;
      await reason.fill("Чек");
      await sendBack.click();
      await dialog.getByRole("button", { name: "Проверить новые условия" }).click();
      await checkbox.check();
      await reason.fill("Исправить");
      history[0].payload = payment("500");
      await (action === "approve" ? approve : sendBack).click();
      await expect(dialog.getByText(/Сверка текущего чека с историей не завершена/)).toBeVisible();
      await expect(approve).toBeDisabled();
      await expect(sendBack).toBeDisabled();
      await expect(checkbox).not.toBeChecked();
      expect(posts).toHaveLength(0);
      history[0].payload = payment("1000");
      await dialog.getByRole("button", { name: "Обновить данные заказа" }).click();
      await checkbox.check();
      await expect(approve).toBeEnabled();
      expect(posts).toHaveLength(0);
    });
  }
  for (const status of [200, 503]) test(role + " retains a decreasing prepayment after HTTP " + status, async ({ page, baseURL }) => {
    const { order, apply, history, posts, dialog, checkbox, approve } = await openReview(role, page, baseURL, true, status);
    expect(order.calculation!.confirmedPaidAmount).toBe("1000.00");
    await checkbox.check();
    await approve.click();
    const check = dialog.getByRole("button", { name: "Проверить результат" });
    await expect(check).toBeVisible();
    apply("approve");
    const event = history[0];
    function correct(paid: string, remaining: string) {
      event.payload = JSON.stringify({ ...JSON.parse(event.payload), confirmedPaidAmount: paid });
      Object.assign(order.calculation!, { confirmedPaidAmount: paid, remainingAmount: remaining });
    }
    correct("500", "4000");
    await check.click();
    await expect(check).toBeEnabled();
    await expect(dialog.getByText("Решение подтверждено историей заказа.")).toHaveCount(0);
    correct("1500", "3000");
    await check.click();
    await expect(dialog.getByText("Решение подтверждено историей заказа.")).toBeVisible();
    expect(posts).toHaveLength(1);
  });
}
