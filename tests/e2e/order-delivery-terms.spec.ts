import { expect, test } from "@playwright/test";
import { deliveryFixture, openSeller, saveFreeDelivery, successScenario } from "./helpers/deliveryTerms";
import { fulfillJson } from "./helpers/mobileAccount";
import { adminOrderFixture, setupAdmin } from "./helpers/admin";

test("продавец меняет стоимость, видит серверный расчёт и историю", async ({page, baseURL}) => successScenario(page, baseURL));

test("A: фоновое чтение блокирует старый submit и сохраняет введённый адрес", async ({page, baseURL}) => {
  await page.clock.install();
  const { order } = await openSeller(page, baseURL);
  let puts = 0;
  await page.route("**/order/43/delivery", route => { puts++; return fulfillJson(route, 43); });
  await page.getByLabel("Адрес или ПВЗ").fill("Черновой адрес");
  Object.assign(order, { termsVersion: 1, deliveryAddress: "Адрес из другой вкладки" });
  await page.clock.fastForward(125000);
  await page.evaluate(() => window.dispatchEvent(new Event("visibilitychange")));
  await expect(page.getByText("Адрес из другой вкладки", {exact:true}).last()).toBeVisible();
  await expect(page.getByRole("button", { name: "Сохранить условия" })).toBeDisabled();
  await expect(page.getByLabel("Адрес или ПВЗ")).toHaveValue("Черновой адрес");
  await page.getByRole("button", { name: "Начать с актуальных условий" }).click();
  await expect(page.getByLabel("Адрес или ПВЗ")).toHaveValue("Адрес из другой вкладки");
  expect(puts).toBe(0);
});

test("B: вторая вкладка получает 409 после проверки, перечитывает заказ и сохраняет черновик", async ({page, context, baseURL}) => {
  const shared = deliveryFixture();
  const second = await context.newPage();
  await openSeller(page, baseURL, shared);
  const {state} = await openSeller(second, baseURL, shared);
  let puts = 0;
  await page.route("**/order/43/delivery", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route,null);
    expect(route.request().postDataJSON().expectedVersion).toBe(0);
    puts++;
    Object.assign(shared, { termsVersion: 1, deliveryAddress: "Первый сохранил" });
    return fulfillJson(route, 43);
  });
  await second.route("**/order/43/delivery", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route,null);
    expect(route.request().postDataJSON().expectedVersion).toBe(0);
    await page.getByLabel("Адрес или ПВЗ").fill("Первый сохранил");
    await saveFreeDelivery(page);
    await expect(page.getByText("Условия доставки обновлены", {exact:true})).toBeVisible();
    puts++;
    await fulfillJson(route,{ code:"ORDER_TERMS_STALE", message:"Устарело", status:409 },409);
  });
  const reads = state.ordersReads;
  await second.getByLabel("Адрес или ПВЗ").fill("Черновик второй вкладки");
  await saveFreeDelivery(second);
  await expect(second.getByText("Версия условий: 1", {exact:true})).toBeVisible();
  await expect(second.getByLabel("Адрес или ПВЗ")).toHaveValue("Черновик второй вкладки");
  await expect(second.getByRole("button", {name:"Сохранить условия"})).toBeDisabled();
  expect(state.ordersReads).toBeGreaterThanOrEqual(reads + 2);
  expect(puts).toBe(2);
});

for (const failure of ["потерян ответ", "неверный ID"]) test(failure + ": закрытие и старый GET сохраняют блокировку", async ({page, baseURL}) => {
  await openSeller(page, baseURL);
  let puts = 0;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/order/43/delivery", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route,null);
    puts++;
    await gate;
    return failure === "неверный ID" ? fulfillJson(route, 44) : route.abort();
  });
  await page.getByRole("button", {name:"Сохранить условия"}).dblclick({force:true});
  await expect.poll(() => puts).toBe(1);
  await page.getByRole("button", {name:"Закрыть детали заказа"}).click();
  await page.getByTestId("desktop-orders").getByRole("button", {name:"Подробнее о заказе №43"}).first().click();
  await expect(page.getByRole("button", {name:"Изменить условия доставки"})).toBeDisabled();
  release();
  await expect(page.getByText(/Результат изменения неизвестен/)).toBeVisible();
  await page.getByRole("button", {name:"Проверить актуальные условия"}).click();
  await expect(page.getByRole("button", {name:"Проверить актуальные условия"})).toBeEnabled();
  await expect(page.getByRole("button", {name:"Изменить условия доставки"})).toBeDisabled();
  expect(puts).toBe(1);
});

test("401: refresh восстанавливает сессию без повторного PUT", async ({page, baseURL}) => {
  await page.context().addCookies([
    { name: "refresh_token", value: "f03-refresh", url: baseURL! },
    { name: "token_created_at", value: String(Date.now()), url: baseURL! },
  ]);
  await openSeller(page, baseURL);
  let puts = 0, refreshes = 0;
  await page.route("**/auth/refresh", route => {
    if (route.request().method() !== "OPTIONS") refreshes++;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify("f03-fresh"),
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, x-refresh-token",
        "Access-Control-Allow-Methods": "POST, OPTIONS" } });
  });
  await page.route("**/order/43/delivery", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route,null);
    puts++;
    return fulfillJson(route, { code: "TOKEN_INVALID_OR_EXPIRED", message: "Срок токена истёк", status: 401 }, 401);
  });
  await saveFreeDelivery(page);
  await expect(page.getByText("Срок токена истёк", { exact:true })).toBeVisible();
  await expect(page.getByRole("button", {name:"Проверить актуальные условия"})).toBeEnabled();
  expect({puts, refreshes}).toEqual({puts:1, refreshes:1});
});

test("принятый PUT и ошибка GET: доступна только контрольная проверка", async ({page, baseURL}) => {
  const {state, order} = await openSeller(page, baseURL);
  let puts = 0;
  await page.route("**/order/43/delivery", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route,null);
    puts++;
    state.ordersStatus = 503;
    order.termsVersion = 1;
    return fulfillJson(route,43);
  });
  const failedRead = page.waitForResponse(response => new URL(response.url()).pathname === "/order/seller" && response.status() === 503);
  await saveFreeDelivery(page);
  await failedRead;
  await expect(page.getByText(/Не удалось подтвердить актуальные условия/)).toBeVisible();
  await expect(page.getByText(/Изменение принято/)).toBeVisible();
  await expect(page.getByRole("button",{name:"Сохранить условия"})).toBeDisabled();
  state.ordersStatus = 200;
  await page.getByRole("button",{name:"Проверить актуальные условия"}).click();
  await expect(page.getByText("Условия доставки обновлены",{exact:true})).toBeVisible();
  expect(puts).toBe(1);
});

test("ADMIN: конфликт переводит заказ за пределы фильтра, детали находят актуальный заказ агента", async ({page, baseURL}) => {
  const state = await setupAdmin(page, baseURL);
  const order = Object.assign(state.orders[0], { deliveryAddress:"Исходный адрес", deliveryCarrier:"YANDEX" });
  let puts = 0;
  await page.route("**/admin/actions/agents/2/orders/201/delivery", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route,null);
    puts++;
    Object.assign(order,{termsVersion:1, actualStatus:"ASSEMBLING", deliveryAddress:"Новый адрес после сборки"});
    return fulfillJson(route,{code:"ORDER_TERMS_STALE",status:409,message:"Конфликт"},409);
  });
  await page.goto("/admin/orders");
  await page.getByRole("button",{name:"Открыть заказ #201"}).click();
  await page.getByRole("button",{name:"Изменить условия доставки"}).click();
  await saveFreeDelivery(page);
  await expect(page.getByRole("dialog").getByText("Новый адрес после сборки",{exact:true})).toBeVisible();
  await expect(page.getByLabel("Адрес или ПВЗ")).toHaveValue("Исходный адрес");
  await expect(page.getByRole("button",{name:"Сохранить условия"})).toBeDisabled();
  expect(puts).toBe(1);
});

test("поздний ответ агента не меняет черновик другого агента", async ({page, baseURL}) => {
  const state = await setupAdmin(page, baseURL);
  Object.assign(state.orders[0], { deliveryAddress: "Первый агент", deliveryCarrier: "YANDEX" });
  state.orders.push(Object.assign(adminOrderFixture(202), { sellerId:3, sellerLogin:"bot-three", deliveryAddress:"Второй агент", deliveryCarrier:"OZON" }));
  let release!: () => void, puts = 0;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/admin/actions/agents/2/orders/201/delivery", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route,null);
    puts++;
    await gate;
    return fulfillJson(route,{code:"ORDER_CASE_ALREADY_OPEN",status:409,message:"Открыто обращение"},409);
  });
  await page.goto("/admin/orders");
  await page.getByRole("button",{name:"Открыть заказ #201"}).click();
  await page.getByRole("button",{name:"Изменить условия доставки"}).click();
  await saveFreeDelivery(page);
  await expect.poll(() => puts).toBe(1);
  await page.getByRole("button",{name:"Закрыть",exact:true}).click();
  await page.getByRole("button",{name:"Открыть заказ #202"}).click();
  await page.getByRole("button",{name:"Изменить условия доставки"}).click();
  await page.getByLabel("Адрес или ПВЗ").fill("Черновик второго агента");
  const reconciled = page.waitForResponse(response => response.url().includes("/admin/actions/agent-orders?"));
  release();
  await reconciled;
  await expect(page.getByRole("button",{name:"Сохранить условия"})).toBeEnabled();
  await expect(page.getByLabel("Адрес или ПВЗ")).toHaveValue("Черновик второго агента");
  await expect(page.getByText(/По заказу открыто обращение/)).toHaveCount(0);
  expect(puts).toBe(1);
});

test("попытка A с потерянным ответом не блокирует тот же номер заказа в сессии B", async ({page, baseURL}) => {
  const { order } = await openSeller(page, baseURL);
  let puts = 0;
  await page.route("**/order/43/delivery", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route,null);
    puts++;
    return route.abort();
  });
  await saveFreeDelivery(page);
  await expect(page.getByText(/Результат изменения неизвестен/)).toBeVisible();
  await page.getByRole("button",{name:"Закрыть детали заказа"}).click();
  await page.getByRole("button",{name:"Выход",exact:true}).click();
  await expect(page).toHaveURL(/\/auth\/login/);
  Object.assign(order,{ deliveryAddress:"Заказ другого продавца" });
  await page.route("**/auth/login", route => fulfillJson(route,{access_token:"f03-account-b",refresh_token:"f03-refresh-b"}));
  await page.getByLabel(/^Email/).fill("b@example.test");
  await page.getByLabel(/^Пароль/).fill("password");
  await page.getByRole("button",{name:"Войти",exact:true}).click();
  await expect(page).not.toHaveURL(/\/auth\/login/);
  if (!new URL(page.url()).pathname.endsWith("/dashboard/sales")) await page.goto("/dashboard/sales");
  await page.getByTestId("desktop-orders").getByRole("button",{name:"Подробнее о заказе №43"}).first().click();
  await page.getByRole("button",{name:"Изменить условия доставки"}).click();
  await expect(page.getByLabel("Адрес или ПВЗ")).toHaveValue("Заказ другого продавца");
  await expect(page.getByLabel("Причина изменения")).toHaveValue("");
  await expect(page.getByText(/Результат изменения неизвестен/)).toHaveCount(0);
  expect(puts).toBe(1);
});

test("обращение, появившееся после открытия формы продавца, блокирует PUT", async ({page, baseURL}) => {
  await openSeller(page, baseURL);
  let puts = 0;
  await page.route("**/order/43/cases", route => fulfillJson(route, [{orderCase:{id:7,orderId:43,state:"OPEN",kind:"CANCELLATION_REQUEST"}}]));
  await page.route("**/order/43/delivery", route => { puts++; return fulfillJson(route,43); });
  await saveFreeDelivery(page);
  await expect(page.getByRole("button",{name:"Сохранить условия"})).toBeDisabled();
  await expect(page.getByLabel("Причина изменения")).toHaveValue("Согласовано");
  expect(puts).toBe(0);
});

for (const status of ["AWAITING_PAYMENT","AWAITING_PREPAYMENT"]) test(status + ": неизвестная стоимость отправляется как null только без подтверждённых денег", async ({page, baseURL}) => {
  const order = deliveryFixture();
  order.actualStatus = status;
  if (status === "AWAITING_PREPAYMENT") Object.assign(order.calculation!, { confirmedPaidAmount: "0.00", remainingAmount: "4500.00" });
  await openSeller(page, baseURL, order);
  let puts = 0;
  await page.route("**/order/43/delivery", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route,null);
    const amount = route.request().postDataJSON().deliveryAmount;
    expect(amount).toBe(status === "AWAITING_PAYMENT" ? "250.00" : null);
    puts++;
    Object.assign(order.calculation!, {deliveryAmount:amount, totalAmount:amount ? "4250.00" : null, remainingAmount:amount ? "3250.00" : null});
    order.termsVersion = 1;
    return fulfillJson(route,43);
  });
  await page.getByLabel("Стоимость уточняется").check();
  const save = page.getByRole("button",{name:"Сохранить условия"});
  if (status === "AWAITING_PAYMENT") {
    await expect(save).toBeDisabled();
    await expect(page.getByText("После частичной оплаты укажите стоимость доставки")).toBeVisible();
    expect(puts).toBe(0);
    await page.getByLabel("Стоимость уточняется").uncheck();
    await page.getByLabel("Стоимость доставки (RUB)").fill("250.00");
    await save.click();
    await expect(page.getByText("Условия доставки обновлены",{exact:true})).toBeVisible();
    expect(puts).toBe(1);
  } else {
    await save.click();
    await expect(page.getByTestId("order-payment-breakdown")).toContainText("Стоимость доставки уточнит продавец");
    expect(puts).toBe(1);
  }
});

for (const rejected of [false,true]) test("ADMIN: агентский маршрут без сканирования очереди, OPEN=" + rejected, async ({page, baseURL}) => {
  const state = await setupAdmin(page, baseURL);
  const order = Object.assign(state.orders[0], { deliveryAddress: "ПВЗ агента", deliveryCarrier:"YANDEX" });
  let puts = 0, histories = 0;
  await page.route("**/admin/actions/agents/2/orders/201/terms-history", route => {
    histories++;
    return fulfillJson(route,[]);
  });
  await page.route("**/admin/actions/agents/2/orders/201/delivery", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route,null);
    expect(route.request().postDataJSON().expectedVersion).toBe(0);
    puts++;
    if (rejected) return fulfillJson(route,{code:"ORDER_CASE_ALREADY_OPEN",message:"Открыто обращение",status:409},409);
    order.termsVersion = 1;
    return fulfillJson(route,201);
  });
  await page.goto("/admin/orders");
  await page.getByRole("button", {name:"Открыть заказ #201"}).click();
  await page.getByRole("button", {name:"История условий доставки"}).click();
  await page.getByRole("button", {name:"Изменить условия доставки"}).click();
  await saveFreeDelivery(page);
  if (rejected) {
    await expect(page.getByText(/По заказу открыто обращение/)).toBeVisible();
    await expect(page.getByLabel("Причина изменения")).toHaveValue("Согласовано");
    await expect(page.getByRole("button", {name:"Сохранить условия"})).toBeDisabled();
  } else await expect(page.getByText("Условия доставки обновлены",{exact:true})).toBeVisible();
  expect(histories).toBeGreaterThan(0);
  expect(puts).toBe(1);
  expect(state.reads.filter(path => path.startsWith("/admin/actions/order-cases"))).toEqual([]);
});
