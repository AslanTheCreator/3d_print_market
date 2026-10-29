import { expect, test } from "@playwright/test";
import { adminCaseFixture, setupAdmin } from "./helpers/admin";
import { expectNoOverflow } from "./helpers/mobileAccount";

test("mobile case Drawer keeps input across breakpoints and completes dispute using touch and keyboard", async ({ page, baseURL }, testInfo) => {
  const state = await setupAdmin(page, baseURL); await page.goto("/admin/order-cases");
  await page.getByRole("button", { name: "Открыть обращение #301" }).tap();
  const drawer = page.getByRole("dialog", { name: "Обращение №301", exact: true });
  await expect(drawer.getByTestId("order-case-card")).toBeVisible();
  await expect.poll(() => drawer.evaluate(node => Math.abs(node.getBoundingClientRect().left))).toBeLessThan(0.5);
  expect(await drawer.evaluate(node => node.getBoundingClientRect().width)).toBeCloseTo(await page.evaluate(() => innerWidth), 1);
  await page.screenshot({ path: testInfo.outputPath("case-mobile.png") });
  await drawer.getByRole("combobox", { name: "Исход", exact: true }).tap();
  await page.getByRole("option", { name: "В пользу покупателя", exact: true }).tap();
  await drawer.getByLabel("Комментарий решения").fill("Мобильное решение по спору");
  for (const width of [900, 393]) {
    await page.setViewportSize({ width, height: 850 });
    await expect(drawer.getByLabel("Комментарий решения")).toHaveValue("Мобильное решение по спору");
  }
  const accept = drawer.getByRole("button", { name: "Принять решение", exact: true });
  await accept.focus(); await page.keyboard.press("Enter");
  await expect(page.getByTestId("admin-case-forms").getByRole("status")).toContainText("Результат операции подтверждён");
  expect(state.writes).toHaveLength(1); expect(state.cases[0].orderStatus).toBe("FAILED");
  await expectNoOverflow(page); await drawer.getByRole("button", { name: "Закрыть обращение" }).tap();
  await page.getByRole("button", { name: "Открыть меню админки" }).tap();
  await expect(page.getByRole("link", { name: "Обращения", exact: true })).toHaveAttribute("href", "/admin/order-cases");
  await page.keyboard.press("Escape");
});

test("mobile payment appeal recovers a lost result after Drawer remount without replaying POST", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL); state.cases = [adminCaseFixture(301, "PAYMENT_APPEAL", "CANCELLED")];
  state.caseAbort = true; state.caseApplyBeforeAbort = true; state.failCaseReadAfterWrite = true;
  await page.goto("/admin/order-cases"); await page.getByRole("button", { name: "Открыть обращение #301" }).tap();
  const drawer = page.getByRole("dialog", { name: "Обращение №301", exact: true });
  await drawer.getByRole("combobox", { name: "Исход", exact: true }).tap(); await page.getByRole("option", { name: "В пользу покупателя", exact: true }).tap();
  await drawer.getByLabel("Комментарий решения").fill("Рассмотрено обращение об оплате"); await drawer.getByRole("button", { name: "Принять решение", exact: true }).tap();
  await expect(page.getByTestId("admin-case-forms").getByRole("status")).toContainText("Не удалось обновить");
  page.once("dialog", dialog => dialog.accept()); await drawer.getByRole("button", { name: "Закрыть обращение" }).tap();
  await page.getByRole("tab", { name: "Завершённые" }).tap(); await page.getByRole("button", { name: "Открыть обращение #301" }).tap();
  await expect(drawer.getByLabel("Комментарий решения")).toHaveValue("Рассмотрено обращение об оплате");
  await expect(drawer.getByRole("button", { name: "Принять решение", exact: true })).toBeDisabled();
  state.caseReadStatus = 200; await drawer.getByRole("button", { name: "Проверить результат операции" }).tap();
  await expect(page.getByTestId("admin-case-forms").getByRole("status")).toContainText("Результат операции подтверждён");
  expect(state.writes).toHaveLength(1); expect(state.cases[0].orderStatus).toBe("CANCELLED"); await expectNoOverflow(page);
});
