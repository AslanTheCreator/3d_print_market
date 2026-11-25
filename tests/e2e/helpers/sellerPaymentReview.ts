import { expect, type Page } from "@playwright/test";
import { fulfillJson, orderFixture, png, setupMobileAccount } from "./mobileAccount";

export async function reviewFixture(page: Page, baseURL: string | undefined, prepayment = false, prepare?: () => Promise<void>) {
  const account = await setupMobileAccount(page, baseURL);
  const order = { ...orderFixture(51, prepayment ? "AWAITING_PREPAYMENT_APPROVAL" : "AWAITING_PAYMENT_APPROVAL", 1),
    paymentProofImageId: 700, prepaymentAmount: prepayment ? 1000 : 0 };
  order.product.sellerId = 1;
  if (prepayment) order.calculation = { ...order.calculation!, confirmedPaidAmount: "0.00", remainingAmount: "4500.00" };
  account.sellerOrders = [order];
  const fixture = { account, order, history: [] as { id: number; kind: string; actor_id: number; payload: string }[],
    posts: [] as { action: string; body: Record<string, unknown> }[], legacy: 0, historyReads: 0, proofIds: [] as string[],
    openCase: false, historyError: false, imageError: false, responseStatus: 200, responseBody: 51 as unknown, gate: Promise.resolve() };
  page.on("request", req => {
    if (req.method() === "POST" && new URL(req.url()).pathname === "/order/51/AWAITING_PAYMENT") fixture.legacy++;
  });
  await page.route("**/order/51/terms-history", route => {
    if (route.request().method() === "GET") fixture.historyReads++;
    return fulfillJson(route, fixture.historyError ? {} : fixture.history, fixture.historyError ? 503 : 200);
  });
  await page.route("**/order/51/cases", route => fulfillJson(route, fixture.openCase ? [{ orderCase: { id: 9, state: "OPEN", orderId: 51 } }] : []));
  await page.route("**/images?ids=*", route => {
    if (route.request().method() === "GET") {
      expect(route.request().headers().authorization).toBe("Bearer mobile-account-test");
      fixture.proofIds.push(new URL(route.request().url()).searchParams.get("ids")!);
    }
    return fulfillJson(route, [{ fileName: "proof.png", contentType: "image/png", imageData: route.request().url().endsWith("700") ? png : "iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAAD0lEQVR4nGMUcdvCwMAAAAS0ARB1ZutyAAAAAElFTkSuQmCC" }], fixture.imageError ? 503 : 200);
  });
  await page.route("**/order/51/payments/review/*", async route => {
    if (route.request().method() === "POST") {
      fixture.posts.push({ action: new URL(route.request().url()).pathname.split("/").at(-1)!, body: route.request().postDataJSON() });
      await fixture.gate;
    }
    return fulfillJson(route, fixture.responseBody, fixture.responseStatus);
  });
  await prepare?.();
  await page.goto("/dashboard/sales");
  const open = page.getByRole("button", { name: prepayment ? "Подтвердить предоплату" : "Проверить оплату", exact: true }).last();
  await open.click();
  const dialog = page.getByRole("dialog", { name: "Проверка платежа по заказу №51" });
  const checkbox = dialog.getByRole("checkbox");
  const approve = dialog.getByRole("button", { name: "Подтвердить оплату", exact: true });
  const sendBack = dialog.getByRole("button", { name: "Вернуть на повторную оплату" });
  const reason = dialog.getByRole("textbox", { name: "Причина возврата" });
  const apply = (action: string, reason?: string) => {
    const confirmedPaidAmount = action === "return" ? order.calculation!.confirmedPaidAmount! : prepayment ? "1000.00" : "4500.00";
    fixture.history.push({ id: 8, actor_id: 1, kind: action === "approve" ? "PAYMENT_APPROVED" : "PAYMENT_RETURNED",
      payload: JSON.stringify({ request: { expectedVersion: order.termsVersion, reason }, confirmedPaidAmount, imageId: order.paymentProofImageId }) });
    order.termsVersion!++;
    order.actualStatus = action === "return" && prepayment ? "AWAITING_PREPAYMENT" :
      action === "approve" && !prepayment ? "ASSEMBLING" : "AWAITING_PAYMENT";
    order.calculation = { ...order.calculation!, confirmedPaidAmount, remainingAmount: action === "return" ? order.calculation!.remainingAmount : prepayment ? "3500.00" : "0.00" };
  };
  return { fixture, dialog, checkbox, approve, sendBack, reason, apply };
}
