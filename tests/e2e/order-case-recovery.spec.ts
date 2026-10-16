import { expect, test, type Page } from "@playwright/test";
import type { OrderCaseDetail } from "@/entities/order";
import { fulfillJson, orderFixture, setupMobileAccount } from "./helpers/mobileAccount";

const details = (page: Page) => page.getByRole("dialog").filter({ has: page.getByText(/Детали заказа №/) });
const open = (page: Page, id: number) => page.getByRole("button", { name: `Подробнее о заказе №${id}`, exact: true }).first().click();
const close = async (page: Page) => { await details(page).getByRole("button", { name: "Закрыть детали заказа", exact: true }).click(); await expect(details(page)).toBeHidden(); };
const mismatch: OrderCaseDetail = { orderCase: { id: 10, orderId: 1, kind: "CANCELLATION_REQUEST", state: "RESOLVED", outcome: "REJECTED" }, orderStatus: "DISPUTED" };

for (const role of ["purchase", "sales"] as const) for (const late of [false, true]) test(`${role}: reconciliation belongs to order 1, late=${late}; order 2 completes B1 and order 1 remains blocked`, async ({ page, baseURL }) => {
  const account = await setupMobileAccount(page, baseURL);
  const orders = [orderFixture(1, "AWAITING_PAYMENT", 1), orderFixture(2, "AWAITING_PAYMENT", 2)].map(order => ({ ...order, paymentProofImageId: null }));
  if (role === "sales") orders.forEach(order => { order.product.sellerId = 1; });
  account[role === "purchase" ? "customerOrders" : "sellerOrders"] = orders;
  const cases: OrderCaseDetail[] = []; const posts: URL[] = [];
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/order/*/cases", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    return fulfillJson(route, new URL(route.request().url()).pathname.includes("/1/") ? [mismatch] : cases);
  });
  await page.route("**/order/2/cancellation-request?*", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    expect(route.request().method()).toBe("POST"); expect(route.request().headers().authorization).toMatch(/^Bearer /);
    expect(route.request().postData()).toBeNull(); const url = new URL(route.request().url()); posts.push(url);
    cases.push({ orderCase: { id: 20, orderId: 2, kind: "CANCELLATION_REQUEST", state: "OPEN", openingComment: url.searchParams.get("comment"), openedBy: 1 }, buyerId: role === "sales" ? 10 : 1, sellerId: role === "sales" ? 1 : 10, orderStatus: "AWAITING_PAYMENT" });
    return fulfillJson(route, null);
  });
  await page.goto(`/dashboard/${role}`);
  await expect(page.getByRole("button", { name: "Подробнее о заказе №2", exact: true }).first()).toBeVisible();
  if (late) account.ordersGate = gate;
  await open(page, 1);
  try {
    if (late) await expect.poll(() => account.ordersReads).toBe(2);
    else await expect(page.getByTestId("order-cases")).toContainText("Статусы заказа и обращений расходятся");
    await close(page);
    const warning = page.getByRole("alert").filter({ hasText: "Заказ №1." });
    await expect(warning).toContainText("Действия недоступны до сверки статуса заказа с обращениями.");
    await expect(warning.getByRole("button", { name: "Обновить заказ", exact: true })).toBeVisible();
    await open(page, 2);
  } finally { release(); account.ordersGate = Promise.resolve(); }
  const form = page.getByTestId("order-case-create");
  await expect(form.getByRole("button", { name: "Запросить отмену", exact: true })).toBeEnabled();
  await expect(page.getByTestId("order-cases")).not.toContainText("Статусы заказа и обращений расходятся");
  await form.getByRole("button", { name: "Запросить отмену", exact: true }).click();
  await form.getByLabel("Комментарий обращения").fill("Отмена только заказа 2");
  await form.getByRole("button", { name: "Отправить обращение", exact: true }).click();
  await expect(form).toContainText("Обращение создано. Заказ и история обновлены.");
  expect(posts).toHaveLength(1); expect(posts[0].pathname).toBe("/order/2/cancellation-request"); expect(posts[0].searchParams.get("comment")).toBe("Отмена только заказа 2");
  await close(page); await open(page, 1);
  await expect(page.getByTestId("order-cases")).toContainText("Статусы заказа и обращений расходятся");
  await expect(form.getByRole("button", { name: "Запросить отмену", exact: true })).toHaveCount(0);
  await page.getByTestId("order-cases").getByRole("button", { name: "Обновить заказ", exact: true }).click();
  await expect(page.getByTestId("order-cases")).toContainText("Статусы заказа и обращений расходятся"); expect(posts).toHaveLength(1);
});

test("late reconciliation from account A cannot block the same orderId after login B", async ({ page, baseURL }) => {
  const account = await setupMobileAccount(page, baseURL); account.customerOrders = [{ ...orderFixture(1, "AWAITING_PAYMENT", 1), paymentProofImageId: null } as ReturnType<typeof orderFixture>];
  let owner = 1, reads = 0, finished = false, release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/order/customer", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    reads++; const snapshot = structuredClone(account.customerOrders);
    if (owner === 1 && reads === 2) { await gate; await fulfillJson(route, snapshot).catch(() => {}); finished = true; }
    else await fulfillJson(route, snapshot);
  });
  await page.route("**/order/1/cases", route => fulfillJson(route, owner === 1 ? [mismatch] : []));
  await page.route("**/auth/login", route => { if (route.request().method() !== "OPTIONS") owner = 2; return fulfillJson(route, { access_token: "account-B", refresh_token: "refresh-B" }); });
  await page.goto("/dashboard/purchase"); await open(page, 1); await expect.poll(() => reads).toBe(2);
  try {
    await page.getByRole("button", { name: "Выход", exact: true, includeHidden: true }).evaluate(button => (button as HTMLButtonElement).click());
    await expect(page).toHaveURL(/\/auth\/login/);
    await page.getByLabel(/^Email/).fill("b@example.test"); await page.getByLabel(/^Пароль/).fill("password"); await page.getByRole("button", { name: "Войти", exact: true }).click();
    await expect(page).not.toHaveURL(/\/auth\/login/); await page.locator('a[href="/dashboard/purchase"]').first().click(); await open(page, 1);
    await expect(page.getByTestId("order-case-create").getByRole("button", { name: "Запросить отмену", exact: true })).toBeEnabled();
  } finally { release(); }
  await expect.poll(() => finished).toBe(true);
  await expect(page.getByTestId("order-cases")).not.toContainText("Статусы заказа и обращений расходятся");
  await expect(page.getByTestId("order-case-create").getByRole("button", { name: "Запросить отмену", exact: true })).toBeEnabled();
});
