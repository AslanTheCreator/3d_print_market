import { expect, test } from "@playwright/test";
import { fulfillJson, setupMobileAccount } from "./helpers/mobileAccount";
import { reviewFixture } from "./helpers/sellerPaymentReview";

for (const stage of ["full", "prepayment"]) for (const action of ["approve", "return"]) {
  test(`${action} ${stage} reserves both decisions and reconciles the server result`, async ({ page, baseURL }) => {
    const { fixture, dialog, checkbox, approve, sendBack, reason, apply } = await reviewFixture(page, baseURL, stage === "prepayment");
    await expect(approve).toBeDisabled();
    await checkbox.check();
    await reason.fill(" ");
    await expect(sendBack).toBeDisabled();
    await reason.fill("я".repeat(501));
    await expect(sendBack).toBeDisabled();
    const message = "я".repeat(stage === "full" ? 500 : 1);
    await reason.fill(message);
    await expect(sendBack).toBeEnabled();
    let release!: () => void;
    fixture.gate = new Promise<void>(resolve => { release = resolve; });
    try {
      await dialog.locator("form").evaluate((form, first) => {
        if (!(form instanceof HTMLFormElement)) throw Error("Форма недоступна");
        const submit = (value: string) => form.requestSubmit(form.querySelector<HTMLButtonElement>(`[value="${value}"]`)!);
        form.requestSubmit();
        submit(first); submit(first); submit(first === "return" ? "approve" : "return");
      }, action);
      await expect.poll(() => fixture.posts).toEqual([{ action, body: action === "approve" ? { expectedVersion: 0 } : { expectedVersion: 0, reason: message } }]);
      await expect(dialog.getByRole("button", { name: "Закрыть", exact: true })).toBeDisabled();
      apply(action, message);
    } finally { release(); }
    await expect(dialog.getByText("Решение подтверждено историей заказа.")).toBeVisible();
    expect(fixture.posts).toHaveLength(1);
    expect(fixture.legacy).toBe(0);
  });
}

test("replacement proof blocks the old decision and clears the previous receipt draft", async ({ page, baseURL }) => {
  const { fixture, dialog, approve, checkbox, reason } = await reviewFixture(page, baseURL);
  await checkbox.check();
  await reason.fill("Проверьте перевод");
  const oldSource = await dialog.getByAltText("Текущий чек №700").getAttribute("src");
  fixture.order.paymentProofImageId = 701;
  fixture.order.termsVersion = 2;
  fixture.history.push({ id: 12, kind: "PAYMENT_SUBMITTED", actor_id: 10, payload: '{"imageId":701,"expectedVersion":1}' });
  await approve.click();
  await expect(dialog.getByAltText("Текущий чек №701")).toBeVisible();
  await expect(dialog.getByAltText("Текущий чек №700")).toHaveCount(0);
  await expect(dialog.getByAltText("Текущий чек №701")).not.toHaveAttribute("src", oldSource!);
  await expect(checkbox).not.toBeChecked();
  await expect(approve).toBeDisabled();
  await expect(reason).toHaveValue("");
  expect(fixture.posts).toEqual([]);
  await dialog.getByRole("button", { name: "Проверить новые условия" }).click();
  await checkbox.check();
  await approve.click();
  await expect.poll(() => fixture.posts).toEqual([{ action: "approve", body: { expectedVersion: 2 } }]);
});

for (const [status, body] of [[200, 52], [200, "51"], [408, {}], [503, {}]] as const) {
  test(`uncertain response ${status} ${JSON.stringify(body)} survives remount and reconnect`, async ({ page, baseURL }) => {
    const { fixture, dialog, approve, checkbox, apply } = await reviewFixture(page, baseURL);
    fixture.responseStatus = status;
    fixture.responseBody = body;
    await checkbox.check();
    await approve.click();
    const check = dialog.getByRole("button", { name: "Проверить результат" });
    await expect(check).toBeVisible();
    await dialog.getByRole("button", { name: "Закрыть", exact: true }).click();
    await page.evaluate(() => { window.dispatchEvent(new Event("offline")); window.dispatchEvent(new Event("online")); });
    await page.getByRole("button", { name: "Проверить результат", exact: true }).last().click();
    await expect(approve).toBeDisabled();
    apply("approve");
    fixture.historyError = true;
    await check.click();
    await expect(check).toBeEnabled();
    fixture.historyError = false;
    await check.click();
    await expect(dialog.getByText("Решение подтверждено историей заказа.")).toBeVisible();
    expect(fixture.posts).toHaveLength(1);
  });
}

test("OPEN case blocks a direct decision", async ({ page, baseURL }) => {
  const { fixture, dialog, approve, checkbox } = await reviewFixture(page, baseURL);
  await checkbox.check();
  fixture.openCase = true;
  await approve.click();
  await expect(dialog.getByText(/Решение не отправлено/)).toBeVisible();
  await expect(approve).toBeDisabled();
  expect(fixture.posts).toEqual([]);
});

test("409 stale forbids a second POST until the changed receipt is inspected", async ({ page, baseURL }) => {
  const { fixture, dialog, checkbox, approve } = await reviewFixture(page, baseURL);
  fixture.responseStatus = 409;
  fixture.responseBody = { code: "ORDER_TERMS_STALE", message: "Версия устарела" };
  await checkbox.check();
  await approve.click();
  const check = dialog.getByRole("button", { name: "Проверить результат" });
  await expect(check).toBeVisible();
  await check.click();
  await expect(check).toBeVisible();
  fixture.order.termsVersion = 2;
  fixture.order.paymentProofImageId = 900;
  fixture.history.push({ id: 12, kind: "PAYMENT_SUBMITTED", actor_id: 10, payload: '{"imageId":900,"expectedVersion":1}' });
  await check.click();
  await expect(dialog.getByAltText("Текущий чек №900")).toBeVisible();
  await expect(approve).toBeDisabled();
  await dialog.getByRole("button", { name: "Проверить новые условия" }).click();
  await checkbox.check();
  await expect(approve).toBeEnabled();
  expect(fixture.posts).toHaveLength(1);
});

test("HTTP 401 refresh never replays review", async ({ page, context, baseURL }) => {
  const { fixture, dialog, checkbox, approve } = await reviewFixture(page, baseURL);
  await context.addCookies([{ name: "refresh_token", value: "fixture-refresh", url: baseURL! },
    { name: "token_created_at", value: String(Date.now()), url: baseURL! }]);
  let refreshes = 0;
  await page.route("**/auth/refresh", route => {
    if (route.request().method() !== "OPTIONS") refreshes++;
    return route.fulfill({ status: route.request().method() === "OPTIONS" ? 204 : 200,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" },
      contentType: "application/json", body: route.request().method() === "OPTIONS" ? "" : JSON.stringify("renewed") });
  });
  fixture.responseStatus = 401;
  fixture.responseBody = { code: "TOKEN_INVALID_OR_EXPIRED", message: "Токен истёк" };
  await checkbox.check();
  await approve.click();
  await expect(dialog.getByText("Токен истёк")).toBeVisible();
  await expect(approve).toBeEnabled();
  expect(refreshes).toBe(1);
  expect(fixture.posts).toHaveLength(1);
});

test("accepted review with failed GET blocks a concurrent cancellation on a stale list", async ({ page, baseURL }) => {
  const { fixture, dialog, checkbox, approve } = await reviewFixture(page, baseURL);
  let cancelPosts = 0;
  page.on("request", req => { if (req.method() === "POST" && req.url().includes("CANCELLED")) cancelPosts++; });
  await page.route("**/order/51/terms-history", route => fixture.posts.length ? fulfillJson(route, {}, 503) : route.fallback());
  await checkbox.check();
  await approve.click();
  await expect(dialog.getByRole("button", { name: "Проверить результат" })).toBeVisible();
  await dialog.getByRole("button", { name: "Закрыть", exact: true }).click();
  fixture.order.actualStatus = "BOOKED";
  await page.clock.setFixedTime(new Date(await page.evaluate(() => Date.now()) + 180_000));
  await page.evaluate(() => { window.dispatchEvent(new Event("offline")); window.dispatchEvent(new Event("online")); });
  await page.getByRole("button", { name: "Отменить", exact: true }).last().click();
  const cancel = page.getByRole("dialog");
  await cancel.getByText("Товар закончился", { exact: true }).click();
  const button = cancel.getByRole("button", { name: "Отменить заказ", exact: true });
  await expect(button).toBeDisabled();
  await button.evaluate(el => (el as HTMLButtonElement).click());
  expect([fixture.posts.length, cancelPosts]).toEqual([1, 0]);
});

test("lost return is observable after resubmission and the new cycle starts with an empty decision", async ({ page, baseURL }) => {
  const { fixture, dialog, reason, sendBack, apply } = await reviewFixture(page, baseURL);
  let posts = 0;
  await page.route("**/order/51/payments/review/return", route => {
    if (route.request().method() !== "POST") return fulfillJson(route, null);
    posts++;
    apply("return", "Старый чек");
    fixture.order.actualStatus = "AWAITING_PAYMENT_APPROVAL";
    fixture.order.paymentProofImageId = 701;
    fixture.order.termsVersion = 2;
    fixture.history.push({ id: 12, kind: "PAYMENT_SUBMITTED", actor_id: 10, payload: '{"imageId":701,"expectedVersion":1}' });
    return route.abort("connectionreset");
  });
  await reason.fill("Старый чек");
  await sendBack.click();
  await expect(dialog.getByText("Решение подтверждено историей заказа.")).toBeVisible();
  await expect(reason).toHaveValue("");
  await expect(dialog.getByAltText("Текущий чек №701")).toBeVisible();
  await expect(dialog.getByRole("checkbox")).not.toBeChecked();
  await expect(sendBack).toBeDisabled();
  expect(posts).toBe(1);
  expect(fixture.legacy).toBe(0);
});

test("changed stage without version increment stops before POST", async ({ page, baseURL }) => {
  const { fixture, dialog, checkbox, approve } = await reviewFixture(page, baseURL, true);
  await checkbox.check();
  fixture.order.actualStatus = "AWAITING_PAYMENT_APPROVAL";
  await approve.click();
  await expect(dialog.getByText("Полная оплата", { exact: true })).toBeVisible();
  await expect(approve).toBeDisabled();
  await expect(checkbox).not.toBeChecked();
  expect(fixture.posts).toEqual([]);
});

test("after approval a regressed seller GET cannot enable the same review again", async ({ page, baseURL }) => {
  const { fixture, dialog, checkbox, approve, apply } = await reviewFixture(page, baseURL);
  const original = structuredClone(fixture.order);
  await checkbox.check();
  let release!: () => void;
  fixture.gate = new Promise<void>(resolve => { release = resolve; });
  try {
    await approve.click();
    await expect.poll(() => fixture.posts.length).toBe(1);
    apply("approve");
  } finally { release(); }
  await expect(dialog.getByText("Решение подтверждено историей заказа.")).toBeVisible();
  await dialog.getByRole("button", { name: "Закрыть", exact: true }).click();
  fixture.account.sellerOrders = [original];
  await page.clock.setFixedTime(new Date(await page.evaluate(() => Date.now()) + 180_000));
  await page.evaluate(() => { window.dispatchEvent(new Event("offline")); window.dispatchEvent(new Event("online")); });
  await expect(page.getByRole("button", { name: "Проверить оплату", exact: true }).last()).toBeDisabled();
  expect(fixture.posts).toHaveLength(1);
});

test("late history GET from before review cannot overwrite the control read", async ({ page, baseURL }) => {
  let release!: () => void;
  const old = new Promise<void>(resolve => { release = resolve; });
  let holdNext = false;
  let held = false;
  const { fixture, dialog, reason, sendBack, apply } = await reviewFixture(page, baseURL, false, async () => {
    await page.route("**/order/51/terms-history", async route => {
      if (!holdNext || held || route.request().method() !== "GET") return route.fallback();
      held = true;
      await old;
      await fulfillJson(route, []).catch(() => {});
    });
  });
  let resume!: () => void;
  fixture.gate = new Promise<void>(resolve => { resume = resolve; });
  try {
    await reason.fill("Нечёткий чек");
    await expect(sendBack).toBeEnabled();
    holdNext = true;
    await page.evaluate(() => { window.dispatchEvent(new Event("offline")); window.dispatchEvent(new Event("online")); });
    await expect.poll(() => held).toBe(true);
    await sendBack.click();
    await expect.poll(() => fixture.posts.length).toBe(1);
    apply("return", "Нечёткий чек");
    resume();
    await expect(dialog.getByText("Решение подтверждено историей заказа.")).toBeVisible();
  } finally { release(); resume(); }
  expect(fixture.posts).toHaveLength(1);
});

test("Enter on a review button cannot repeat a pending POST", async ({ page, baseURL }) => {
  const { fixture, approve, checkbox } = await reviewFixture(page, baseURL);
  let release!: () => void;
  fixture.gate = new Promise<void>(resolve => { release = resolve; });
  try {
    await checkbox.check();
    await approve.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await expect.poll(() => fixture.posts.length).toBe(1);
    await expect(approve).toBeDisabled();
  } finally { release(); }
  expect(fixture.legacy).toBe(0);
});

test("a pending cancellation prevents a competing seller review after a list refresh", async ({ page, baseURL }) => {
  const { fixture, dialog } = await reviewFixture(page, baseURL);
  await dialog.getByRole("button", { name: "Закрыть", exact: true }).click();
  const reconnect = async () => {
    await page.clock.setFixedTime(new Date(await page.evaluate(() => Date.now()) + 180_000));
    await page.evaluate(() => { window.dispatchEvent(new Event("offline")); window.dispatchEvent(new Event("online")); });
  };
  fixture.order.actualStatus = "BOOKED";
  await reconnect();
  await page.getByRole("button", { name: "Отменить", exact: true }).last().click();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let cancellations = 0;
  await page.route("**/order/51/CANCELLED", async route => {
    if (route.request().method() === "POST") { cancellations++; await gate; }
    return fulfillJson(route, {}, 503);
  });
  try {
    const cancel = page.getByRole("dialog");
    await cancel.getByLabel("Причина отмены").fill("Отмена заказа");
    await cancel.getByRole("button", { name: "Отменить заказ", exact: true }).click();
    await expect.poll(() => cancellations).toBe(1);
    fixture.order.actualStatus = "AWAITING_PAYMENT_APPROVAL";
    await reconnect();
    const review = page.getByRole("button", { name: "Проверить оплату", exact: true, includeHidden: true }).last();
    await expect(review).toBeDisabled();
    await review.evaluate(el => (el as HTMLButtonElement).click());
    expect(fixture.posts).toHaveLength(0);
  } finally { release(); }
});

test("buyer sees the seller's return reason for the same submitted receipt", async ({ page, browser, baseURL }) => {
  const { fixture, dialog, reason, sendBack, apply } = await reviewFixture(page, baseURL);
  fixture.order.termsVersion = 1;
  fixture.history.push({ id: 7, actor_id: 10, kind: "PAYMENT_SUBMITTED", payload: '{"expectedVersion":0,"imageId":700}' });
  await reason.fill("Дата перевода не совпадает");
  await sendBack.click();
  await dialog.getByRole("button", { name: "Проверить новые условия" }).click();
  await expect(reason).toHaveValue("");
  await reason.fill("Дата перевода не совпадает");
  let release!: () => void;
  fixture.gate = new Promise<void>(resolve => { release = resolve; });
  try {
    await sendBack.click();
    await expect.poll(() => fixture.posts).toEqual([{ action: "return", body: { expectedVersion: 1, reason: "Дата перевода не совпадает" } }]);
    apply("return", "Дата перевода не совпадает");
  } finally { release(); }
  await expect(dialog.getByText("Решение подтверждено историей заказа.")).toBeVisible();
  const buyer = await browser.newContext({ baseURL });
  try {
    const purchase = await buyer.newPage();
    const account = await setupMobileAccount(purchase, baseURL);
    account.customerOrders = [{ ...fixture.order, userInfo: { ...fixture.order.userInfo, id: 1 } }];
    await purchase.route("**/auth/profile", route => fulfillJson(route, { id: 10, login: "buyer", role: "USER", fullName: "Покупатель" }));
    await purchase.route("**/order/51/terms-history", route => fulfillJson(route, fixture.history));
    await purchase.goto("/dashboard/purchase");
    await purchase.getByRole("button", { name: "Подтвердить оплату", exact: true }).last().click();
    await expect(purchase.getByRole("dialog").getByText("Причина возврата чека: Дата перевода не совпадает")).toBeVisible();
    expect(fixture.legacy).toBe(0);
  } finally { await buyer.close(); }
});

for (const networkError of ["timedout", "connectionreset"] as const) {
  test("lost approve " + networkError + " can only be reconciled by reading", async ({ page, baseURL }) => {
    const { fixture, dialog, approve, checkbox, apply } = await reviewFixture(page, baseURL, true);
    let posts = 0;
    await page.route("**/order/51/payments/review/approve", route => {
      if (route.request().method() !== "POST") return fulfillJson(route, null);
      posts++;
      return route.abort(networkError);
    });
    await checkbox.check();
    await approve.click();
    const check = dialog.getByRole("button", { name: "Проверить результат" });
    await expect(check).toBeVisible();
    apply("approve");
    await check.click();
    await expect(dialog.getByText("Решение подтверждено историей заказа.")).toBeVisible();
    expect(posts).toBe(1);
    expect(fixture.legacy).toBe(0);
  });
}

for (const [status, code, rejected] of [
  [400, "ORDER_PAYMENT_INVALID", true], [403, "ACCESS_DENIED", true], [404, "ORDER_NOT_FOUND", true],
  [409, "ORDER_LEGACY_RECONCILIATION_REQUIRED", true], [409, "ORDER_CASE_ALREADY_OPEN", true], [404, "PARTICIPANT_NOT_FOUND", false],
  [400, "BAD_REQUEST", false], [409, "ORDER_PAYMENT_INVALID", false], [403, "UNKNOWN", false],
] as const) {
  test(`review denial ${status} ${code} requires an exact server contract`, async ({ page, baseURL }) => {
    const { fixture, dialog, sendBack, reason } = await reviewFixture(page, baseURL);
    fixture.responseStatus = status;
    fixture.responseBody = { code, message: "Ответ сервера" };
    await reason.fill("Нужен другой чек");
    await sendBack.click();
    if (rejected) {
      await expect(dialog.getByText("Ответ сервера")).toBeVisible();
      await expect(sendBack).toBeEnabled();
      await expect(reason).toHaveValue("Нужен другой чек");
    } else {
      const check = dialog.getByRole("button", { name: "Проверить результат" });
      await expect(check).toBeVisible();
      const reads = fixture.historyReads;
      await check.click();
      await expect.poll(() => fixture.historyReads).toBeGreaterThan(reads);
      await expect(sendBack).toBeDisabled();
    }
    expect(fixture.posts).toHaveLength(1);
    expect(fixture.legacy).toBe(0);
  });
}

test("conflicting proof blocks both submit handlers until an explicit fresh decision", async ({ page, baseURL }) => {
  const { fixture, dialog, checkbox, approve, reason } = await reviewFixture(page, baseURL);
  await checkbox.check();
  await reason.fill("Проверить перевод");
  fixture.order.termsVersion = 3;
  fixture.history.push({ id: 10, actor_id: 10, kind: "PAYMENT_SUBMITTED", payload: '{"expectedVersion":2,"imageId":701}' });
  await approve.click();
  await expect(dialog.getByText(/Сверка текущего чека/)).toBeVisible();
  await expect(checkbox).not.toBeChecked();
  await dialog.locator("form").evaluate(form => {
    for (const button of form.querySelectorAll<HTMLButtonElement>('button[type="submit"]')) (form as HTMLFormElement).requestSubmit(button);
  });
  expect(fixture.posts).toEqual([]);
  fixture.order.paymentProofImageId = 701;
  await dialog.getByRole("button", { name: "Обновить данные заказа" }).click();
  await dialog.getByRole("button", { name: "Проверить новые условия" }).click();
  await expect(reason).toHaveValue("");
  await expect(approve).toBeDisabled();
  await checkbox.check();
  await approve.click();
  await expect.poll(() => fixture.posts).toEqual([{ action: "approve", body: { expectedVersion: 3 } }]);
});

test("inconsistent balance stops a direct approval and fresh calculation restores it", async ({ page, baseURL }) => {
  const { fixture, dialog, checkbox, approve } = await reviewFixture(page, baseURL);
  await checkbox.check();
  fixture.order.calculation!.remainingAmount = "2500.00";
  await approve.click();
  await expect(dialog.getByRole("button", { name: "Обновить данные заказа" })).toBeVisible();
  await dialog.locator("form").evaluate(form => (form as HTMLFormElement).requestSubmit(form.querySelector<HTMLButtonElement>('[value="approve"]')!));
  expect(fixture.posts).toEqual([]);
  fixture.order.calculation!.remainingAmount = "3500.00";
  await dialog.getByRole("button", { name: "Обновить данные заказа" }).click();
  await checkbox.check();
  await approve.click();
  await expect.poll(() => fixture.posts.length).toBe(1);
});

for (const rejected of [true, false]) {
  test(`cancel recovery after entering payment review: rejected=${rejected}`, async ({ page, baseURL }) => {
    const { fixture, dialog } = await reviewFixture(page, baseURL);
    await dialog.getByRole("button", { name: "Закрыть", exact: true }).click();
    fixture.order.actualStatus = "BOOKED";
    fixture.order.termsVersion = 2;
    await page.clock.setFixedTime(new Date(await page.evaluate(() => Date.now()) + 180000));
    await page.evaluate(() => { window.dispatchEvent(new Event("offline")); window.dispatchEvent(new Event("online")); });
    await page.getByRole("button", { name: "Отменить", exact: true }).last().click();
    let cancellations = 0;
    await page.route("**/order/51/CANCELLED", route => {
      if (route.request().method() === "POST") {
        cancellations++;
        fixture.order.actualStatus = "AWAITING_PAYMENT_APPROVAL";
        fixture.order.termsVersion = 1;
      }
      return fulfillJson(route, { code: "ACCESS_DENIED" }, rejected ? 403 : 503);
    });
    const cancel = page.getByRole("dialog");
    await cancel.getByLabel("Причина отмены").fill("Отмена заказа");
    await cancel.getByRole("button", { name: "Отменить заказ", exact: true }).click();
    const review = page.getByRole("button", { name: "Проверить оплату", exact: true, includeHidden: true }).last();
    await expect(cancel.getByText(/Не удалось проверить результат отмены/)).toBeVisible();
    await expect(review).toBeDisabled();
    fixture.order.termsVersion = 3;
    await cancel.getByRole("button", { name: "Проверить результат", exact: true }).click();
    if (rejected) await expect(review).toBeEnabled();
    else {
      await expect(cancel.getByText("Статус заказа изменился. Прямая отмена недоступна.", { exact: true })).toBeVisible();
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Проверить результат отмены" }).last().click();
      await expect(review).toBeDisabled();
    }
    expect(cancellations).toBe(1);
    expect(fixture.posts).toEqual([]);
  });
}

for (const prepayment of [false, true]) for (const action of ["approve", "return"]) {
  test(`raw fractional control version retains ${action} reservation, prepayment=${prepayment}`, async ({ page, baseURL }) => {
    const { fixture, dialog, approve, checkbox, reason, sendBack, apply } = await reviewFixture(page, baseURL, prepayment);
    fixture.responseStatus = action === "approve" ? 200 : 503;
    if (action === "approve") { await checkbox.check(); await approve.click(); }
    else { await reason.fill("Другой чек"); await sendBack.click(); }
    const check = dialog.getByRole("button", { name: "Проверить результат" });
    await expect(check).toBeEnabled();
    apply(action, "Другой чек");
    const raw = JSON.stringify([fixture.order]).replace('"termsVersion":1', '"termsVersion":1.0000000000000000001');
    const url = "**/order/seller";
    await page.route(url, route => route.request().method() === "GET"
      ? route.fulfill({ body: raw, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" } }) : route.fallback());
    await check.click();
    await expect(check).toBeEnabled();
    await expect(dialog.getByText("Решение подтверждено историей заказа.")).toHaveCount(0);
    await page.unroute(url);
    await check.click();
    await expect(dialog.getByText("Решение подтверждено историей заказа.")).toBeVisible();
    expect(fixture.posts).toHaveLength(1);
  });
}

test("delivery conflict retains the draft, changing payment stage clears it", async ({ page, baseURL }) => {
  const { fixture, dialog, reason, sendBack } = await reviewFixture(page, baseURL, true);
  await reason.fill("Нужен чек предоплаты");
  fixture.order.transfer.address = "Другой адрес";
  await sendBack.click();
  await dialog.getByRole("button", { name: "Проверить новые условия" }).click();
  await expect(reason).toHaveValue("Нужен чек предоплаты");
  fixture.order.actualStatus = "AWAITING_PAYMENT_APPROVAL";
  fixture.order.termsVersion = 2;
  fixture.history.push(
    { id: 10, actor_id: 1, kind: "PAYMENT_APPROVED", payload: '{"imageId":700,"confirmedPaidAmount":"1000","request":{"expectedVersion":0}}' },
    { id: 11, actor_id: 10, kind: "PAYMENT_SUBMITTED", payload: '{"imageId":700,"expectedVersion":1}' },
  );
  await sendBack.click();
  await expect(dialog.getByText("Полная оплата", { exact: true })).toBeVisible();
  await expect(reason).toHaveValue("");
  expect(fixture.posts).toEqual([]);
});

for (const status of [200, 503]) {
  test(`shipped order with outstanding balance keeps review protected after HTTP ${status}`, async ({ page, baseURL }) => {
    const { fixture, dialog, approve, checkbox, apply } = await reviewFixture(page, baseURL);
    fixture.responseStatus = status;
    await checkbox.check();
    await approve.click();
    const check = dialog.getByRole("button", { name: "Проверить результат" });
    await expect(check).toBeEnabled();
    const before = fixture.order.calculation!;
    apply("approve");
    fixture.order.actualStatus = "ON_THE_WAY";
    const settled = fixture.order.calculation;
    const event = fixture.history[0];
    const payload = event.payload;
    fixture.order.calculation = before;
    event.payload = JSON.stringify({ ...JSON.parse(payload), confirmedPaidAmount: before.confirmedPaidAmount });
    await check.click();
    await expect(check).toBeEnabled();
    fixture.order.calculation = settled;
    event.payload = payload;
    await check.click();
    await expect(dialog.getByText("Решение подтверждено историей заказа.")).toBeVisible();
    expect(fixture.posts).toHaveLength(1);
  });
}

test("editing the return reason during a history conflict preserves it for the same submission", async ({ page, baseURL }) => {
  const { fixture, dialog, reason, sendBack } = await reviewFixture(page, baseURL);
  const submission = { id: 8, actor_id: 10, kind: "PAYMENT_SUBMITTED", payload: '{"imageId":700,"expectedVersion":0}' };
  fixture.history.push(submission);
  fixture.order.termsVersion = 1;
  await reason.fill("Проверить сумму");
  await sendBack.click();
  await dialog.getByRole("button", { name: "Проверить новые условия" }).click();
  await reason.fill("Сумма не совпала");
  submission.payload = '{"imageId":701,"expectedVersion":0}';
  await sendBack.click();
  await expect(dialog.getByText(/Сверка текущего чека/)).toBeVisible();
  await reason.fill("Сумма оплаты не совпала");
  submission.payload = '{"imageId":700,"expectedVersion":0}';
  await dialog.getByRole("button", { name: "Обновить данные заказа" }).click();
  await expect(sendBack).toBeEnabled();
  await expect(reason).toHaveValue("Сумма оплаты не совпала");
  expect(fixture.posts).toEqual([]);
});
