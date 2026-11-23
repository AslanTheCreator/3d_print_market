import { expect, test } from "@playwright/test";
import { setupAdmin } from "./helpers/admin";
import { deliveryFixture, openSeller, saveFreeDelivery } from "./helpers/deliveryTerms";
import { fulfillJson, png, setupMobileAccount } from "./helpers/mobileAccount";

function gate() {
  let release!: () => void;
  const wait = new Promise<void>(resolve => { release = resolve; });
  return { wait, release };
}

for (const conflict of [false, true]) {
  test(`первый GET истории задержан, ответ PUT — ${conflict ? 409 : 200}`, async ({ page, baseURL }) => {
    const { order } = await openSeller(page, baseURL);
    const old = gate();
    const released = gate();
    let gets = 0, puts = 0;
    await page.route("**/order/43/terms-history", async route => {
      if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
      if (++gets === 1) {
        await old.wait;
        try { await fulfillJson(route, []); } finally { released.release(); }
        return;
      }
      return fulfillJson(route, [{ kind: "DELIVERY_CHANGED", payload: '{"before":{"deliveryAmount":500},"after":{"deliveryAmount":0,"reason":"Новое событие"}}' }]);
    });
    await page.route("**/order/43/delivery", route => {
      if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
      puts++;
      order.termsVersion = 1;
      return conflict ? fulfillJson(route, { code: "ORDER_TERMS_STALE", message: "Конфликт", status: 409 }, 409) : fulfillJson(route, 43);
    });
    await page.getByRole("button", { name: "История условий доставки" }).click();
    await expect.poll(() => gets).toBe(1);
    try {
      await saveFreeDelivery(page);
      await expect(page.getByText("Причина: Новое событие")).toBeVisible();
    } finally { old.release(); }
    await released.wait;
    await expect(page.getByText("Причина: Новое событие")).toBeVisible();
    if (conflict) await expect(page.getByLabel("Причина изменения")).toHaveValue("Согласовано");
    expect({ gets, puts }).toEqual({ gets: 2, puts: 1 });
  });
}

test("ошибка чтения истории после PUT допускает повтор только GET", async ({ page, baseURL }) => {
  const { order } = await openSeller(page, baseURL);
  let puts = 0, reads = 0;
  await page.route("**/order/43/terms-history", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    reads++;
    return reads === 2 ? fulfillJson(route, {}, 503) : fulfillJson(route, puts ? [{ kind: "DELIVERY_CHANGED", payload: "{}" }] : []);
  });
  await page.route("**/order/43/delivery", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    puts++;
    order.termsVersion = 1;
    return fulfillJson(route, 43);
  });
  await page.getByRole("button", { name: "История условий доставки" }).click();
  await expect(page.getByText("Изменений доставки пока нет")).toBeVisible();
  await saveFreeDelivery(page);
  const error = page.getByRole("alert").filter({ hasText: "Не удалось загрузить историю условий" });
  await error.getByRole("button", { name: "Повторить" }).click();
  await expect(page.getByText("Изменение доставки", { exact: true })).toBeVisible();
  expect({ reads, puts }).toEqual({ reads: 3, puts: 1 });
});

test("ADMIN без sellerId не открывает историю или редактирование участника", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL);
  Reflect.deleteProperty(state.orders[0], "sellerId");
  let calls = 0;
  await page.route(/\/order\/201\/(terms-history|delivery)$/, route => { calls++; return fulfillJson(route, []); });
  await page.goto("/admin/orders");
  await page.getByRole("button", { name: "Открыть заказ #201" }).click();
  await expect(page.getByText(/не определён агент заказа/)).toBeVisible();
  await expect(page.getByRole("button", { name: "История условий доставки" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Изменить условия доставки" })).toHaveCount(0);
  expect(calls).toBe(0);
});

for (const paid of ["1000.00", null, "0.00"]) {
  test(`прямой submit неизвестной доставки при confirmedPaidAmount=${paid}`, async ({ page, baseURL }) => {
    const order = deliveryFixture();
    Object.assign(order.calculation!, { confirmedPaidAmount: paid, remainingAmount: paid === null ? null : "3500.00" });
    await openSeller(page, baseURL, order);
    const costs: Array<string | null> = [];
    await page.route("**/order/43/delivery", route => {
      if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
      costs.push(route.request().postDataJSON().deliveryAmount);
      order.termsVersion = 1;
      return fulfillJson(route, 43);
    });
    const unknown = page.getByLabel("Стоимость уточняется");
    await unknown.check();
    if (paid !== "0.00") {
      await expect(page.getByRole("button", { name: "Сохранить условия" })).toBeDisabled();
      await unknown.press("Enter");
    }
    await page.locator("form").filter({ has: unknown }).evaluate(form => (form as HTMLFormElement).requestSubmit());
    if (paid !== "0.00") {
      await unknown.uncheck();
      await page.getByLabel("Стоимость доставки (RUB)").fill("250.00");
      await page.getByLabel("Стоимость доставки (RUB)").press("Enter");
    }
    await expect(page.getByText("Условия доставки обновлены", { exact: true })).toBeVisible();
    expect(costs).toEqual(paid === "0.00" ? [null] : ["250.00"]);
  });
}

test("подтверждённая оплата изменилась во время проверки продавца", async ({ page, baseURL }) => {
  const order = deliveryFixture();
  order.calculation!.confirmedPaidAmount = "0.00";
  await openSeller(page, baseURL, order);
  await page.getByLabel("Стоимость уточняется").check();
  let puts = 0;
  const cases = gate();
  const started = gate();
  await page.route("**/order/43/cases", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    started.release();
    await cases.wait;
    return fulfillJson(route, []);
  });
  await page.route("**/order/43/delivery", route => { puts++; return fulfillJson(route, 43); });
  await page.getByRole("button", { name: "Сохранить условия" }).click();
  await started.wait;
  order.calculation!.confirmedPaidAmount = "1000.00";
  cases.release();
  await expect(page.getByText(/Условия изменились. Черновик сохранён/)).toBeVisible();
  expect(puts).toBe(0);
});

test("обновление расчёта во время upload блокирует денежный POST", async ({ page, baseURL }) => {
  await page.clock.install();
  const state = await setupMobileAccount(page, baseURL);
  const order = deliveryFixture();
  order.actualStatus = "AWAITING_PAYMENT";
  state.customerOrders.push(order);
  const upload = gate();
  const started = gate();
  let posts = 0;
  await page.route("**/accounts/participant/*", route => fulfillJson(route, [{ id: 44, participantId: 2, username: "Fixture", entityValue: "TEST", transferMoney: "BANK_CARD" }]));
  await page.route("**/images?tag=ORDER&entityId=43", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    started.release();
    await upload.wait;
    return fulfillJson(route, [77]);
  });
  await page.route("**/order/43/ASSEMBLING*", route => { if (route.request().method() === "POST") posts++; return fulfillJson(route, 43); });
  await page.goto("/dashboard/purchase");
  await page.getByRole("button", { name: "Подтвердить оплату", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Подтверждение оплаты" });
  await dialog.locator('input[type="file"]').setInputFiles({ name: "receipt.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
  await dialog.getByRole("button", { name: "Подтвердить оплату", exact: true }).click();
  await started.wait;
  order.termsVersion = 1;
  Object.assign(order.calculation!, { deliveryAmount: "0.00", remainingAmount: "3000.00", totalAmount: "4000.00" });
  await page.clock.fastForward(125000);
  await page.evaluate(() => window.dispatchEvent(new Event("visibilitychange")));
  await expect(dialog.getByText(/^Осталось оплатить:/)).toContainText(/3\s?000/);
  upload.release();
  await expect(dialog.getByText(/Условия заказа изменились/)).toBeVisible();
  expect(posts).toBe(0);
});

for (const version of [1, 2]) test(`ADMIN → Покупки: защита оплаты до актуального расчёта версии ${version}`, async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL);
  const order = Object.assign(state.orders[0], { actualStatus: "AWAITING_PAYMENT", deliveryCarrier: "YANDEX", deliveryAddress: "ПВЗ" });
  const previous = structuredClone(order);
  const wait = gate();
  let puts = 0, posts = 0, afterWrite = 0;
  let response: "error" | "old" | "current" = "error";
  const button = (name: string) => page.getByRole("button", { name, exact: true }).first();
  const link = (name: string) => page.getByRole("link", { name, exact: true }).first();
  await page.route("**/order/customer", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    if (puts) {
      afterWrite++;
      await wait.wait;
      if (response === "error") return fulfillJson(route, { message: "Список недоступен" }, 400);
    }
    const row = response === "old" ? { ...previous, termsVersion: version - 1 } : order;
    return fulfillJson(route, [{ ...row, userInfo: { ...row.userInfo, id: 2 } }]);
  });
  await page.route("**/participant", route => fulfillJson(route, { id: 1, role: "ADMIN", status: "ACTIVE", login: "administrator", fullName: "Администратор", mail: "admin@example.test", addresses: [], accounts: [], transfers: [], socialNetworks: [] }));
  await page.route("**/giveaways/active", route => fulfillJson(route, {}, 404));
  await page.route("**/accounts/participant/2", route => fulfillJson(route, [{ id: 44, participantId: 2, username: "Fixture", entityValue: "TEST", transferMoney: "BANK_CARD" }]));
  await page.route("**/order/201/ASSEMBLING*", route => { if (route.request().method() === "POST") posts++; return fulfillJson(route, 201); });
  await page.route("**/admin/actions/agents/2/orders/201/delivery", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    puts++;
    order.termsVersion = version;
    Object.assign(order.calculation!, { deliveryAmount: "0.00", totalAmount: "4000.00", remainingAmount: "3000.00" });
    return fulfillJson(route, 201);
  });
  await page.goto("/dashboard/purchase");
  await expect(button("Подтвердить оплату")).toBeEnabled();
  await page.evaluate(() => { document.documentElement.dataset.f03 = "same"; });
  await link("Обзор").click();
  await link("Администрирование").click();
  await page.getByRole("combobox", { name: "Статус заказа" }).click();
  await page.locator('[role="option"][data-value="AWAITING_PAYMENT"]').click();
  await button("Открыть заказ #201").click();
  await button("Изменить условия доставки").click();
  await saveFreeDelivery(page);
  await expect(page.getByText("Условия доставки обновлены", { exact: true })).toBeVisible();
  await expect(page.getByText(`Версия условий: ${version}`, { exact: true })).toBeVisible();
  await button("Закрыть").click();
  await link("В личный кабинет").click();
  await link("Покупки").click();
  await expect.poll(() => afterWrite).toBeGreaterThan(0);
  await expect(button("Подтвердить оплату")).toBeDisabled();
  wait.release();
  await expect(page.getByText(/Не удалось обновить заказы. Действия недоступны/)).toBeVisible();
  await expect(button("Подтвердить оплату")).toBeDisabled();
  response = "old";
  const oldRead = page.waitForResponse(reply => new URL(reply.url()).pathname === "/order/customer" && reply.status() === 200);
  await button("Повторить").click();
  await oldRead;
  await expect(button("Подтвердить оплату")).toBeDisabled();
  response = "current";
  await button("Подробнее о заказе №201").click();
  await page.getByTestId("order-payment-breakdown").getByRole("button", { name: "Обновить заказ" }).click();
  await expect(page.getByTestId("order-payment-breakdown")).toContainText(/3\s?000,00/);
  await expect(page.getByRole("dialog").getByText(`Версия условий: ${version}`, { exact: true })).toBeVisible();
  await button("Закрыть детали заказа").click();
  await button("Подтвердить оплату").click();
  await expect(page.getByRole("dialog").getByText(/^Осталось оплатить:/)).toContainText(/3\s?000,00/);
  await expect(page.locator("html")).toHaveAttribute("data-f03", "same");
  expect({ puts, posts }).toEqual({ puts: 1, posts: 0 });
});
