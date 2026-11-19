import { expect, test, type Locator } from "@playwright/test";
import { adminOrderFixture, setupAdmin } from "./helpers/admin";
import { fulfillJson, orderFixture, setupMobileAccount } from "./helpers/mobileAccount";

async function rate(dialog: Locator) {
  const rating = dialog.locator('input[value="5"]');
  await rating.focus();
  await rating.press("Space");
  await expect(rating).toBeChecked();
}

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
};

for (const width of [1280, 393]) {
  test(`buyer publishes a FAILED order once without a comment at ${width}px`, async ({ page, baseURL }) => {
    await page.setViewportSize({ width, height: 900 });
    const state = await setupMobileAccount(page, baseURL);
    const order = { ...orderFixture(1, "FAILED", 1), reviewId: null, canLeaveReview: true };
    state.customerOrders = [order];
    const writes: unknown[] = [];
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    await page.route("**/reviews", async route => {
      if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
      writes.push(route.request().postDataJSON());
      await pending;
      const reviewedOrder = { ...order, reviewId: 702, canLeaveReview: false };
      state.customerOrders = [reviewedOrder];
      return fulfillJson(route, 702);
    });

    await page.goto("/dashboard/purchase");
    const leaveReview = page.getByRole("button", { name: "Оставить отзыв", exact: true });
    const orders = page.getByTestId(width === 393 ? "mobile-orders" : "desktop-orders");
    const published = orders.getByText("Отзыв оставлен", { exact: true });
    await leaveReview.click();
    const dialog = page.getByRole("dialog");
    await rate(dialog);
    const submit = dialog.getByRole("button", { name: "Отправить отзыв", exact: true });
    const reads = state.ordersReads;
    await submit.click();
    try {
      await expect.poll(() => writes).toEqual([{ orderId: 1, rating: 5 }]);
      await expect(dialog.getByRole("button", { name: "Отправка..." })).toBeDisabled();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeVisible();
    } finally {
      release();
    }
    await expect(dialog.getByText("Спасибо за отзыв!")).toBeVisible();
    await expect.poll(() => state.ordersReads).toBeGreaterThan(reads);
    await dialog.getByRole("button", { name: "Закрыть", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(published).toBeVisible();
    await expect(leaveReview).toHaveCount(0);
    await page.reload();
    await expect(published).toBeVisible();
    await expect(leaveReview).toHaveCount(0);
    expect(writes).toHaveLength(1);
  });
}

for (const code of ["REVIEW_ALREADY_EXIST", "ORDER_NOT_TERMINATED"]) {
  test(`${code} blocks the form even when the reread returns the old order`, async ({ page, baseURL }) => {
    const state = await setupMobileAccount(page, baseURL);
    const order = { ...orderFixture(1, "COMPLETED", 1), reviewId: null, canLeaveReview: true };
    state.customerOrders = [order];
    let writes = 0;
    await page.route("**/reviews", route => {
      if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
      writes++;
      return fulfillJson(route, { code, message: "Отзыв отклонён", status: 400 }, 400);
    });
    await page.goto("/dashboard/purchase");
    const leaveReview = page.getByRole("button", { name: "Оставить отзыв", exact: true });
    await leaveReview.click();
    const dialog = page.getByRole("dialog");
    await rate(dialog);
    const reads = state.ordersReads;
    await dialog.getByRole("button", { name: "Отправить отзыв", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect.poll(() => state.ordersReads).toBeGreaterThan(reads);
    await expect(leaveReview).toHaveCount(0);
    await expect(page.getByText("Спасибо за отзыв!")).toHaveCount(0);
    await expect(page.getByText("Отзыв оставлен", { exact: true })).toHaveCount(0);
    const afterConflict = state.ordersReads;
    const check = page.getByRole("button", { name: "Проверить состояние отзыва", exact: true });
    await expect(check).toBeVisible();
    if (code === "REVIEW_ALREADY_EXIST") {
      await check.click();
    } else {
      await page.clock.setFixedTime(new Date(await page.evaluate(() => Date.now()) + 180_000));
      await page.evaluate(() => {
        window.dispatchEvent(new Event("offline"));
        window.dispatchEvent(new Event("online"));
      });
    }
    await expect.poll(() => state.ordersReads).toBeGreaterThan(afterConflict);
    await expect(leaveReview).toBeEnabled();
    expect(writes).toBe(1);
  });
}

for (const applied of [true, false]) {
  test(`timeout waits for a fresh read and never repeats POST (applied=${applied})`, async ({ page, baseURL }) => {
    const state = await setupMobileAccount(page, baseURL);
    const order = { ...orderFixture(1, "COMPLETED", 1), reviewId: null, canLeaveReview: true };
    state.customerOrders = [order];
    const gate = deferred();
    let writes = 0;
    await page.route("**/reviews", route => {
      if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
      writes++;
      if (applied) {
        const reviewed = { ...order, reviewId: 702, canLeaveReview: false };
        state.customerOrders = [reviewed];
      }
      state.ordersGate = gate.promise;
      return fulfillJson(route, { code: "TIMEOUT", message: "Нет ответа" }, 408);
    });
    await page.goto("/dashboard/purchase");
    await page.getByRole("button", { name: "Оставить отзыв", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await rate(dialog);
    const send = dialog.getByRole("button", { name: "Отправить отзыв", exact: true });
    const reads = state.ordersReads;
    await send.click();
    try {
      await expect(dialog.getByText("Проверяем состояние отзыва…")).toBeVisible();
      await expect.poll(() => state.ordersReads).toBeGreaterThan(reads);
      await expect(send).toBeDisabled();
      await send.evaluate(button => button.dispatchEvent(new MouseEvent("click", { bubbles: true })));
      expect(writes).toBe(1);
    } finally {
      gate.resolve();
    }
    if (applied) {
      await expect(dialog.getByText("Отзыв оставлен", { exact: true })).toBeVisible();
      await expect(send).toBeDisabled();
    } else {
      await expect(send).toBeEnabled();
    }
    await expect(dialog.getByText("Спасибо за отзыв!")).toHaveCount(0);
    expect(writes).toBe(1);
  });
}

test("failed control read keeps the draft blocked and retries only the read", async ({ page, baseURL }) => {
  const state = await setupMobileAccount(page, baseURL);
  const order = { ...orderFixture(1, "COMPLETED", 1), reviewId: null, canLeaveReview: true };
  state.customerOrders = [order];
  let writes = 0;
  await page.route("**/reviews", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    writes++;
    state.ordersStatus = 500;
    return route.abort("timedout");
  });
  await page.goto("/dashboard/purchase");
  await page.getByRole("button", { name: "Оставить отзыв", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await rate(dialog);
  const draft = dialog.getByRole("textbox", { name: "Комментарий" });
  await draft.fill("Черновик отзыва");
  const send = dialog.getByRole("button", { name: "Отправить отзыв", exact: true });
  await send.click();
  const check = dialog.getByRole("button", { name: "Проверить состояние отзыва" });
  await expect(check).toBeVisible();
  await expect(send).toBeDisabled();
  await expect(draft).toHaveValue("Черновик отзыва");
  state.ordersStatus = 200;
  const reads = state.ordersReads;
  await check.click();
  await expect(send).toBeEnabled();
  expect(state.ordersReads).toBe(reads + 1);
  expect(writes).toBe(1);
});

test("a read started before POST cannot override fresh review state", async ({ page, baseURL }) => {
  const state = await setupMobileAccount(page, baseURL);
  const order = { ...orderFixture(1, "COMPLETED", 1), reviewId: null, canLeaveReview: true };
  state.customerOrders = [order];
  const stale = deferred();
  const staleFinished = deferred();
  let reads = 0;
  let writes = 0;
  await page.route("**/order/customer", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    if (++reads !== 2) return fulfillJson(route, state.customerOrders);
    await stale.promise;
    try { await fulfillJson(route, [order]); }
    catch { /* The old GET can already be cancelled. */ }
    finally { staleFinished.resolve(); }
  });
  await page.route("**/reviews", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    writes++;
    const reviewed = { ...order, reviewId: 702, canLeaveReview: false };
    state.customerOrders = [reviewed];
    return fulfillJson(route, { code: "TIMEOUT", message: "Нет ответа" }, 408);
  });
  await page.goto("/dashboard/purchase");
  await page.getByRole("button", { name: "Оставить отзыв", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await rate(dialog);
  await page.clock.setFixedTime(new Date(await page.evaluate(() => Date.now()) + 180_000));
  await page.evaluate(() => {
    window.dispatchEvent(new Event("offline"));
    window.dispatchEvent(new Event("online"));
  });
  try {
    await expect.poll(() => reads).toBe(2);
    await dialog.getByRole("button", { name: "Отправить отзыв", exact: true }).click();
    await expect(dialog.getByText("Отзыв оставлен", { exact: true })).toBeVisible();
  } finally {
    stale.resolve();
  }
  await staleFinished.promise;
  await expect(dialog.getByText("Отзыв оставлен", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Отправить отзыв", exact: true })).toBeDisabled();
  expect(writes).toBe(1);
});

test("a late review check from account A does not change the same order ID in account B", async ({ page, baseURL }) => {
  await setupMobileAccount(page, baseURL);
  const order = { ...orderFixture(1, "COMPLETED", 1), reviewId: null, canLeaveReview: true };
  const lateCheck = deferred();
  const lateFinished = deferred();
  let readsA = 0;
  let readsB = 0;
  let writes = 0;
  await page.route("**/auth/profile", route => {
    const isB = route.request().headers().authorization === "Bearer review-account-b";
    return fulfillJson(route, { id: isB ? 2 : 1, login: isB ? "review-b" : "review-a", role: "USER", imageId: null });
  });
  await page.route("**/auth/login", route => fulfillJson(route, { access_token: "review-account-b", refresh_token: "review-refresh-b" }));
  await page.route("**/order/customer", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    if (route.request().headers().authorization === "Bearer review-account-b") {
      readsB++;
      return fulfillJson(route, [order]);
    }
    if (++readsA === 1) return fulfillJson(route, [order]);
    await lateCheck.promise;
    try { await fulfillJson(route, [{ ...order, reviewId: 702, canLeaveReview: false }]); }
    catch { /* Teardown cancels the old account's GET. */ }
    finally { lateFinished.resolve(); }
  });
  await page.route("**/reviews", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    writes++;
    return fulfillJson(route, { code: "TIMEOUT", message: "Нет ответа" }, 408);
  });
  await page.goto("/dashboard/purchase");
  const leaveReview = page.getByRole("button", { name: "Оставить отзыв", exact: true });
  await leaveReview.click();
  const dialog = page.getByRole("dialog");
  await rate(dialog);
  await dialog.getByRole("button", { name: "Отправить отзыв", exact: true }).click();
  try {
    await expect.poll(() => readsA).toBe(2);
    await dialog.getByRole("button", { name: "Отмена", exact: true }).click();
    await expect(dialog).toBeHidden();
    await page.getByRole("button", { name: "Выход", exact: true }).click();
    await expect(page).toHaveURL(/\/auth\/login/);
    const login = page.getByRole("button", { name: "Войти", exact: true });
    await expect.poll(() => login.evaluate(element =>
      Object.keys(element).some(key => key.startsWith("__reactProps$")))).toBe(true);
    await page.getByLabel(/^Email/).fill("fixture-b@example.test");
    await page.getByLabel(/^Пароль/).fill("password");
    await login.click();
    await expect(page).not.toHaveURL(/\/auth\/login/);
    const purchases = page.locator('a[href="/dashboard/purchase"]:visible').first();
    if (!page.url().endsWith("/dashboard/purchase")) await purchases.click();
    await expect(leaveReview).toBeEnabled();
    expect(readsB).toBeGreaterThan(0);
  } finally {
    lateCheck.resolve();
  }
  await lateFinished.promise;
  await expect(leaveReview).toBeEnabled();
  await expect(page.getByText("Отзыв оставлен", { exact: true })).toHaveCount(0);
  expect(writes).toBe(1);
});

test("seller and admin see a published review without a buyer action", async ({ page, baseURL }) => {
  const seller = await setupMobileAccount(page, baseURL);
  const sellerOrder = { ...orderFixture(1, "FAILED", 1), reviewId: 702, canLeaveReview: false };
  seller.sellerOrders = [sellerOrder];
  await page.goto("/dashboard/sales");
  await expect(page.getByTestId("desktop-orders").getByText("Отзыв оставлен", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Оставить отзыв" })).toHaveCount(0);

  const admin = await setupAdmin(page, baseURL);
  const adminOrder = { ...adminOrderFixture(201, "FAILED"), reviewId: 702, canLeaveReview: false };
  admin.orders = [adminOrder];
  await page.goto("/admin/orders?status=all");
  await expect(page.getByText("Отзыв оставлен", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Открыть заказ #201" }).click();
  const details = page.getByRole("dialog");
  await expect(details.getByText("Отзыв оставлен", { exact: true })).toBeVisible();
  await expect(details.getByRole("button", { name: "Оставить отзыв" })).toHaveCount(0);
});
