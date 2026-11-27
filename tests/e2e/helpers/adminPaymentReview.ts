import { expect, type Page } from "@playwright/test";
import { adminOrderFixture, setupAdmin } from "./admin";

export async function adminReviewFixture(page: Page, baseURL: string | undefined, prepayment = false, agentPage = false) {
  const state = await setupAdmin(page, baseURL);
  const order = adminOrderFixture(201, prepayment ? "AWAITING_PREPAYMENT_APPROVAL" : "AWAITING_PAYMENT_APPROVAL");
  order.paymentProofImageId = 77;
  state.orders = [order];
  state.reviewHistory[201] = [];
  const posts: string[] = [];
  page.on("request", req => { if (req.method() === "POST") posts.push(new URL(req.url()).pathname); });
  await page.goto(agentPage ? `/admin/agents/2?tab=orders&status=${order.actualStatus}` : `/admin/orders?status=${order.actualStatus}`);
  await page.getByRole("button", { name: "Открыть заказ #201" }).click();
  await page.getByRole("button", { name: prepayment ? "Подтвердить предоплату" : "Проверить оплату" }).click();
  const dialog = page.getByRole("dialog", { name: "Проверка платежа по заказу №201" });
  await expect(dialog.getByText("Агент #2")).toBeVisible();
  const checkbox = dialog.getByRole("checkbox");
  const approve = dialog.getByRole("button", { name: "Подтвердить оплату" });
  const sendBack = dialog.getByRole("button", { name: "Вернуть на повторную оплату" });
  const reason = dialog.getByLabel("Причина возврата");
  const check = dialog.getByRole("button", { name: "Проверить результат" });
  function apply(action: "approve" | "return", comment = "", actor = 1) {
    const paid = action === "return" ? order.calculation!.confirmedPaidAmount! : prepayment ? "2000.00" : "4500.00";
    state.reviewHistory[201].push({ id: 8, actor_id: actor, kind: action === "return" ? "PAYMENT_RETURNED" : "PAYMENT_APPROVED",
      payload: JSON.stringify({ imageId: order.paymentProofImageId, confirmedPaidAmount: paid,
        request: { expectedVersion: order.termsVersion, ...(action === "return" && { reason: comment }) } }) });
    order.actualStatus = action === "return" && prepayment ? "AWAITING_PREPAYMENT" : action === "approve" && !prepayment ? "ASSEMBLING" : "AWAITING_PAYMENT";
    order.termsVersion!++;
    Object.assign(order.calculation!, { confirmedPaidAmount: paid, remainingAmount: action === "return" ? "3500.00" : prepayment ? "2500.00" : "0.00" });
  }
  return { state, order, posts, dialog, checkbox, approve, sendBack, reason, check, apply };
}
