import { expect, test, type Page } from "@playwright/test";
import type { OrderCaseDetail } from "@/entities/order";
import { fulfillJson, orderFixture, setupMobileAccount, png, expectNoOverflow } from "./helpers/mobileAccount";

const proof = { name: "dispute-proof.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") };
const comment = "Оплата уже совершена & ? = +";
const trigger = (page: Page) => page.getByRole("button", { name: "Приложить подтверждение оплаты к спору", exact: true });
const payment = (page: Page) => page.getByRole("dialog", { name: "Подтверждение оплаты в споре", exact: true });
const submit = (page: Page) => payment(page).getByRole("button", { name: "Добавить подтверждение к спору", exact: true });
const openDetails = (page: Page) => page.getByRole("button", { name: "Подробнее о заказе №1", exact: true }).first().click();
// Вложенный MUI Dialog скрывает родителя от accessibility tree; моделируем его unmount.
const unmount = async (page: Page, paymentState: "closed" | "open" = "closed") => {
  const close = page.getByRole("button", { name: "Закрыть детали заказа", exact: true, includeHidden: true });
  const paymentIncludingHidden = page.getByRole("dialog", { name: "Подтверждение оплаты в споре", exact: true, includeHidden: true });
  await expect(close).toHaveCount(1);
  if (paymentState === "open") {
    await expect(payment(page)).toBeVisible();
    await expect(close.locator('xpath=ancestor::*[@aria-hidden="true"]').first()).toBeAttached();
    await close.dispatchEvent("click");
  } else {
    // Ждём завершения exit transition, а не разового isVisible() уходящего диалога.
    await expect(paymentIncludingHidden).toHaveCount(0);
    await page.getByRole("button", { name: "Закрыть детали заказа", exact: true }).click();
  }
  await expect(page.getByRole("dialog", { name: /Детали заказа №/, includeHidden: true })).toHaveCount(0);
  await expect(payment(page)).toBeHidden();
  await expect(paymentIncludingHidden).toHaveCount(0);
};

async function setup(page: Page, baseURL?: string, role: "purchase" | "sales" = "purchase", otherOrder = false) {
  const account = await setupMobileAccount(page, baseURL);
  const order = orderFixture(1, "DISPUTED", 1);
  if (role === "sales") { order.product.sellerId = 1; order.userInfo.id = 10; }
  account[role === "purchase" ? "customerOrders" : "sellerOrders"] = [order];
  if (otherOrder) account.customerOrders.push(orderFixture(2, "DISPUTED", 2));
  const state = {
    account, order,
    cases: [{ orderCase: { id: 8, orderId: 1, kind: "DISPUTE", state: "OPEN", previousOrderStatus: "AWAITING_PAYMENT" },
      buyerId: role === "purchase" ? 1 : 10, sellerId: order.product.sellerId, orderStatus: "DISPUTED", paymentProofImageId: 77, orderImages: [], caseImages: [],
    }] as OrderCaseDetail[],
    posts: [] as URL[], uploads: 0, deletes: 0, accounts: 0, reads: 0, imageReads: 0,
    readFailure: false, record: true, lost: false, reject: false, failAfterPost: false,
    postGate: Promise.resolve(), uploadGate: Promise.resolve(),
  };
  await page.route("**/order/1/cases", route => {
    if (route.request().method() !== "OPTIONS") state.reads++;
    return fulfillJson(route, state.readFailure ? { message: "GET failed" } : state.cases, state.readFailure ? 500 : 200);
  });
  if (otherOrder) await page.route("**/order/2/cases", route => fulfillJson(route, [{ ...state.cases[0],
    orderCase: { ...state.cases[0].orderCase, id: 18, orderId: 2 },
  }]));
  await page.route("**/images?tag=ORDER&entityId=1", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    state.uploads++; expect(route.request().headers().authorization).toMatch(/^Bearer /);
    expect(route.request().postDataBuffer()?.toString()).toContain('name="files"');
    await state.uploadGate;
    state.order.images = [101]; state.cases[0].orderImages = [101];
    await fulfillJson(route, [101]);
  });
  await page.route("**/order/1/ASSEMBLING?*", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    state.posts.push(new URL(route.request().url()));
    expect(route.request().method()).toBe("POST"); expect(route.request().headers().authorization).toMatch(/^Bearer /);
    expect(route.request().postData()).toBeNull();
    await state.postGate;
    if (state.reject) return fulfillJson(route, { code: "ORDER_CASE_INVALID_TRANSITION", message: "Состояние изменилось" }, 400);
    if (state.record) state.cases[0].caseImages = [101];
    if (state.failAfterPost) { state.readFailure = true; account.ordersStatus = 500; }
    return state.lost ? route.abort("connectionfailed") : fulfillJson(route, 1);
  });
  page.on("request", request => {
    if (request.method() === "OPTIONS") return;
    const path = new URL(request.url()).pathname;
    if (path.startsWith("/accounts/participant/")) state.accounts++;
    if (path === "/images" && request.method() === "DELETE") state.deletes++;
    if (path === "/images" && request.method() === "GET") state.imageReads++;
  });
  await page.goto(`/dashboard/${role}`); await openDetails(page);
  return state;
}
async function fill(page: Page) {
  await trigger(page).click();
  await payment(page).getByLabel("Комментарий к подтверждению (необязательно)").fill(comment);
  await payment(page).getByLabel("Подтверждение оплаты в споре", { exact: true }).setInputFiles(proof);
}

for (const width of [393, 1280]) test(`buyer attaches proof, keeps DISPUTED, refreshes evidence without accounts at ${width}px`, async ({ page, baseURL }) => {
  await page.setViewportSize({ width, height: 900 });
  const state = await setup(page, baseURL); await fill(page);
  expect(state.uploads).toBe(0); await submit(page).click();
  await expect(payment(page).getByText("Подтверждение добавлено к спору. Заказ и доказательства обновлены.", { exact: true })).toBeVisible();
  expect(state.posts).toHaveLength(1); expect([...state.posts[0].searchParams]).toEqual([["imageId", "101"], ["comment", comment]]);
  expect(state.order.actualStatus).toBe("DISPUTED"); expect(state.accounts).toBe(0); expect(state.deletes).toBe(0);
  expect(state.reads).toBeGreaterThanOrEqual(4); expect(state.account.ordersReads).toBeGreaterThanOrEqual(4);
  expect(state.imageReads).toBeGreaterThan(1);
  await expect(submit(page)).toBeDisabled(); await expectNoOverflow(page);
  await payment(page).getByRole("button", { name: "Закрыть", exact: true }).click();
  await expect(page.getByTestId("order-case-card").getByRole("img")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Детали заказа №1" })).toContainText("На рассмотрении");
});

for (const mode of ["seller", "other kind", "previous status", "resolved", "unknown", "foreign buyer"] as const) test(`availability excludes ${mode}`, async ({ page, baseURL }) => {
  const state = await setup(page, baseURL, mode === "seller" ? "sales" : "purchase");
  if (mode === "seller") { await expect(trigger(page)).toHaveCount(0); return; }
  if (mode === "other kind") state.cases[0].orderCase!.kind = "PAYMENT_APPEAL";
  if (mode === "previous status") state.cases[0].orderCase!.previousOrderStatus = "ON_THE_WAY";
  if (mode === "resolved") state.cases[0].orderCase!.state = "RESOLVED";
  if (mode === "unknown") state.cases = [{}];
  if (mode === "foreign buyer") state.cases[0].buyerId = 999;
  await unmount(page); await openDetails(page);
  await expect(page.getByTestId("order-cases").getByRole("progressbar")).toHaveCount(0);
  await expect(trigger(page)).toHaveCount(0); expect(state.posts).toHaveLength(0);
});

for (const mode of ["lost with proof", "lost without proof", "success GET failure"] as const) test(`${mode} persists across close/remount and only rechecks the original image`, async ({ page, baseURL }) => {
  const state = await setup(page, baseURL); state.lost = mode.startsWith("lost"); state.record = mode !== "lost without proof"; state.failAfterPost = mode === "success GET failure";
  await fill(page); await submit(page).click();
  await expect(payment(page).getByRole("status")).toContainText(mode === "lost with proof" ? "Подтверждение добавлено" : mode === "lost without proof" ? "Результат отправки неизвестен" : "Подтверждение принято");
  await payment(page).getByRole("button", { name: "Закрыть", exact: true }).click(); await unmount(page); await openDetails(page); await trigger(page).click();
  await expect(payment(page).getByLabel("Комментарий к подтверждению (необязательно)")).toHaveValue(comment);
  await expect(payment(page).getByText("dispute-proof.png — загружен", { exact: true })).toBeVisible();
  await submit(page).dispatchEvent("click"); expect(state.posts).toHaveLength(1);
  if (mode !== "lost with proof") {
    state.readFailure = false; state.account.ordersStatus = 200;
    await payment(page).getByRole("button", { name: "Проверить подтверждение в споре" }).click();
    await expect(payment(page).getByRole("status")).toContainText(mode === "lost without proof" ? "Результат отправки неизвестен" : "Подтверждение добавлено");
    if (mode === "lost without proof") {
      state.cases[0].caseImages = [101]; state.cases[0].orderCase!.state = "RESOLVED"; state.cases[0].orderStatus = "FAILED"; state.order.actualStatus = "FAILED";
      await payment(page).getByRole("button", { name: "Проверить подтверждение в споре" }).click();
      await expect(payment(page).getByRole("status")).toContainText("Подтверждение добавлено");
    }
  }
  expect(state.posts).toHaveLength(1); expect(state.uploads).toBe(1); expect(state.deletes).toBe(0);
});

test("pending POST survives remount and blocks duplicate; completed result updates the new instance", async ({ page, baseURL }) => {
  const state = await setup(page, baseURL); let release!: () => void; state.postGate = new Promise<void>(resolve => { release = resolve; });
  await fill(page); await submit(page).click();
  try {
    await expect.poll(() => state.posts.length).toBe(1); await unmount(page, "open"); await openDetails(page); await trigger(page).click();
    const pending = payment(page).getByRole("button", { name: "Отправка подтверждения…", exact: true });
    await expect(pending).toBeDisabled(); await pending.dispatchEvent("click"); expect(state.posts).toHaveLength(1);
  } finally { release(); }
  await expect(payment(page).getByRole("status")).toContainText("Подтверждение добавлено"); expect(state.uploads).toBe(1);
});

test("local draft survives close and order selection without leaking file or comment to another order", async ({ page, baseURL }) => {
  const state = await setup(page, baseURL, "purchase", true); await fill(page);
  await payment(page).getByRole("button", { name: "Закрыть", exact: true }).click(); await unmount(page);
  await page.getByRole("button", { name: "Подробнее о заказе №2", exact: true }).first().click(); await trigger(page).click();
  await expect(payment(page).getByLabel("Комментарий к подтверждению (необязательно)")).toHaveValue("");
  await expect(payment(page).getByText("dispute-proof.png — выбран", { exact: true })).toHaveCount(0);
  await payment(page).getByRole("button", { name: "Закрыть", exact: true }).click(); await unmount(page); await openDetails(page); await trigger(page).click();
  await expect(payment(page).getByLabel("Комментарий к подтверждению (необязательно)")).toHaveValue(comment);
  await expect(payment(page).getByText("dispute-proof.png — выбран", { exact: true })).toBeVisible();
  expect(state.uploads).toBe(0); expect(state.posts).toHaveLength(0);
  await submit(page).click(); await expect(payment(page).getByRole("status")).toContainText("Подтверждение добавлено");
  expect(state.posts[0].pathname).toBe("/order/1/ASSEMBLING");
});

for (const mode of ["resolution during upload", "unmount during upload", "preflight fails", "resolution during POST"] as const) test(`${mode} preserves proof and avoids a stale or duplicate write`, async ({ page, baseURL }) => {
  const state = await setup(page, baseURL); await fill(page);
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  if (mode.includes("upload")) state.uploadGate = gate;
  if (mode === "resolution during POST") state.postGate = gate;
  if (mode === "preflight fails") state.readFailure = true;
  await submit(page).click();
  try {
    if (mode.includes("upload")) await expect.poll(() => state.uploads).toBe(1);
    if (mode === "resolution during POST") await expect.poll(() => state.posts.length).toBe(1);
    if (mode === "unmount during upload") await unmount(page, "open");
    if (mode.startsWith("resolution")) {
      state.order.actualStatus = "FAILED"; state.cases[0].orderStatus = "FAILED"; state.cases[0].orderCase!.state = "RESOLVED";
      state.reject = mode === "resolution during POST";
    }
  } finally { release(); }
  if (mode === "unmount during upload") {
    await openDetails(page); await trigger(page).click();
    await expect(payment(page).getByText("dispute-proof.png — загружен", { exact: true })).toBeVisible();
  } else await expect(payment(page).getByRole("status")).toContainText(mode === "preflight fails" ? "Не удалось прочитать" : /состояние спора изменилось|Состояние спора изменилось/);
  expect(state.posts).toHaveLength(mode === "resolution during POST" ? 1 : 0);
  expect(state.deletes).toBe(0); await expect(payment(page).getByLabel("Комментарий к подтверждению (необязательно)")).toHaveValue(comment);
});
