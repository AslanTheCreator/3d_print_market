import { test, expect } from "@playwright/test";
import { adminOrderFixture, adminProductFixture, setupAdmin } from "./helpers/admin";
import { expectNoOverflow } from "./helpers/mobileAccount";

test("guest redirects and buyer never starts admin requests", async ({ page, baseURL }) => {
  await page.goto("/admin/orders");
  await expect(page).toHaveURL(/auth\/login\?redirect=/);
  const state = await setupAdmin(page, baseURL, "USER");
  await page.goto("/admin/orders");
  await expect(page.getByText("Доступ разрешён только администратору.")).toBeVisible();
  expect(state.reads.filter((path) => path.startsWith("/admin/"))).toEqual([]);
});

test("admin shell, no analytics, noindex and session exit", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL);
  const analytics: string[] = [];
  page.on("request", (request) => { if (request.url().includes("mc.yandex")) analytics.push(request.url()); });
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Заказы", exact: true })).toBeVisible();
  await expect(page.locator('[data-testid="app-chrome"]')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  expect(analytics).toEqual([]);
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(page).toHaveURL(/auth\/login/);
  state.role = "USER";
  await page.context().addCookies([{ name: "access_token", value: "buyer-new-session", url: baseURL! }]);
  state.reads.length = 0;
  await page.goto("/admin/orders");
  await expect(page.getByText("Доступ разрешён только администратору.")).toBeVisible();
  expect(state.reads.filter((path) => path.startsWith("/admin/"))).toEqual([]);
});

test("product fanout limited to four and partial failure remains visible", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL);
  state.agents = Array.from({ length: 7 }, (_, index) => ({ id: index + 2, login: `bot-${index + 2}`, status: "ACTIVE" }));
  state.listDelay = 150; state.failedAgent = 3;
  await page.goto("/admin/products");
  await expect(page.getByText(/Неполная выдача/)).toBeVisible();
  await expect(page.getByText("Фигурка дракона 101")).toBeVisible();
  expect(state.maxLists).toBeLessThanOrEqual(4);
  state.failedAgent = 0;
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(page.getByText(/Неполная выдача/)).toHaveCount(0);
});

test("product saves exact relationships, null and zero without public seller PUT", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL);
  await page.goto("/admin/products/101");
  await page.getByLabel("Название", { exact: true }).fill("Обновлённая фигурка");
  await page.getByRole("button", { name: "Сохранить изменения", exact: true }).click();
  await expect(page.getByText("Изменения сохранены", { exact: true })).toBeVisible();
  expect(state.writes[0]).toMatchObject({ method: "PUT", path: "/admin/actions/agents/2/products/101", body: { count: 0, categoryIds: [1], imageIds: [77], availability: "EXTERNAL_PRODUCT", externalUrl: "https://t.me/example/123" } });
  await page.getByLabel("Без ограничения количества").check();
  await page.getByRole("button", { name: "Сохранить изменения", exact: true }).click();
  await expect.poll(() => state.writes.length).toBe(2);
  expect(state.writes[1].body?.count).toBeNull();
});

test("incomplete product relations block save but preserve status actions", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL); state.relationsStatus = 403;
  await page.goto("/admin/products/101");
  await expect(page.getByText(/Сохранение заблокировано/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Сохранить изменения", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Заблокировать", exact: true })).toBeEnabled();
  expect(state.writes).toHaveLength(0);
});

test("save and restore retries only status after partial success", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL); state.products[0].status = "BLOCKED"; state.restoreStatus = 500;
  await page.goto("/admin/products/101");
  await page.getByRole("button", { name: "Сохранить и восстановить", exact: true }).click();
  await expect(page.getByText("Изменения сохранены, но восстановление не завершено.")).toBeVisible();
  state.restoreStatus = 200;
  await page.getByRole("button", { name: "Повторить восстановление" }).click();
  await expect(page.getByText("Товар восстановлен", { exact: true })).toBeVisible();
  expect(state.writes.map((write) => write.path)).toEqual(["/admin/actions/agents/2/products/101", "/admin/actions/product/101", "/admin/actions/product/101"]);
});

test("settings account 404 and read failure after create never duplicate POST", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL); state.failAccountsReadAfterWrite = true;
  await page.goto("/admin/agents/2?tab=settings");
  const section = page.locator(".MuiPaper-root").filter({ has: page.getByRole("heading", { name: "Реквизиты", exact: true }) });
  await expect(section.getByText(/Добавьте их до первой продажи/)).toBeVisible();
  await section.getByRole("button", { name: "Добавить запись" }).click();
  await section.getByLabel("Получатель", { exact: true }).fill("Получатель теста");
  await section.getByLabel("Реквизиты для оплаты", { exact: true }).fill("Тестовые реквизиты");
  await section.getByRole("button", { name: "Сохранить запись" }).click();
  await expect(section.getByText(/Не удалось перечитать список/)).toBeVisible();
  state.accountsStatus = 200;
  await section.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(section.getByText(/Получатель теста/)).toBeVisible();
  expect(state.writes.filter((write) => write.method === "POST")).toHaveLength(1);
});

for (const prepayment of [0, 2000]) test(`order confirms with root amounts and sellerId: ${prepayment}`, async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL); state.orders = [adminOrderFixture(201, "BOOKED", prepayment)];
  await page.goto("/admin/orders");
  await page.getByRole("button", { name: "Открыть заказ #201" }).click();
  await expect(page.getByText(`Стоимость товаров: ${prepayment + 6000} RUB`, { exact: true })).toBeVisible();
  await expect(page.getByText("Остаток: 6000 RUB", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Подтвердить заказ", exact: true }).click();
  const dialog = page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: "Подтвердить заказ", exact: true }) });
  await expect(dialog.getByText(/У бота нет реквизитов/)).toBeVisible();
  await dialog.getByLabel("Комментарий", { exact: true }).fill("Проверено администратором");
  await dialog.getByRole("button", { name: "Подтвердить заказ", exact: true }).click();
  await expect(page.getByText(/заказ больше не входит/)).toBeVisible();
  expect(state.writes).toHaveLength(1);
  expect(state.writes[0].path).toBe("/admin/actions/agents/2/orders/201/CONFIRM");
  expect(new URLSearchParams(state.writes[0].search).get("comment")).toBe("Проверено администратором");
});

test("SHIP validates URL and preserves input after refusal", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL); state.orders = [adminOrderFixture(201, "ASSEMBLING")]; state.actionStatus = 409;
  await page.goto("/admin/orders?status=ASSEMBLING");
  await page.getByRole("button", { name: "Открыть заказ #201" }).click();
  await page.getByRole("button", { name: "Отправить", exact: true }).click();
  const dialog = page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: "Отправить", exact: true }) });
  await dialog.getByLabel("Ссылка доставки", { exact: true }).fill("javascript:alert(1)");
  await dialog.getByRole("button", { name: "Отправить", exact: true }).click();
  await expect(dialog.getByText("Укажите полную HTTP/HTTPS-ссылку")).toBeVisible(); expect(state.writes).toHaveLength(0);
  await dialog.getByLabel("Ссылка доставки", { exact: true }).fill("https://example.com/track/123");
  await dialog.getByRole("button", { name: "Отправить", exact: true }).click();
  await expect(dialog.getByText("Действие отклонено")).toBeVisible();
  await expect(dialog.getByLabel("Ссылка доставки", { exact: true })).toHaveValue("https://example.com/track/123");
  expect(new URLSearchParams(state.writes[0].search).get("deliveryUrl")).toBe("https://example.com/track/123");
});

test("unknown order outcome is reconciled without repeating action", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL); state.actionAbort = true; state.applyBeforeAbort = true;
  await page.goto("/admin/orders");
  await page.getByRole("button", { name: "Открыть заказ #201" }).click();
  await page.getByRole("button", { name: "Подтвердить заказ", exact: true }).click();
  await page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: "Подтвердить заказ", exact: true }) }).getByRole("button", { name: "Подтвердить заказ", exact: true }).click();
  await expect(page.getByText(/заказ больше не входит/)).toBeVisible();
  expect(state.writes).toHaveLength(1);
  expect(state.reads.some((path) => path === "/admin/actions/agents/2/orders?page=0&size=50")).toBeTruthy();
});

test("proof uses authorization and has retry after forbidden response", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL); state.orders[0].images = [77]; state.proofStatus = 403;
  const imageHeaders: (string | undefined)[] = [];
  page.on("request", (request) => { if (request.url().includes("/images?")) imageHeaders.push(request.headers().authorization); });
  await page.goto("/admin/orders"); await page.getByRole("button", { name: "Открыть заказ #201" }).click();
  await expect(page.getByText("Нет доступа к файлу")).toBeVisible();
  state.proofStatus = 200;
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(page.getByRole("img", { name: "payment.png" })).toBeVisible();
  expect(imageHeaders.every(Boolean)).toBeTruthy();
});

test("desktop and mobile layouts fit and use accessible navigation", async ({ page, baseURL }) => {
  await setupAdmin(page, baseURL);
  for (const width of [320, 393, 599, 600, 768, 899, 900, 1376]) {
    await page.setViewportSize({ width, height: 900 }); await page.goto("/admin/orders");
    await expect(page.getByRole("button", { name: "Открыть заказ #201" })).toBeVisible();
    await expectNoOverflow(page);
    if (width < 900) await expect(page.getByRole("button", { name: "Открыть меню админки" })).toBeVisible();
    else await expect(page.getByRole("table", { name: "Заказы ботов" })).toBeVisible();
  }
  await page.setViewportSize({ width: 393, height: 727 }); await page.goto("/admin/products");
  await expect(page.getByText("Фигурка дракона 101")).toBeVisible(); await expectNoOverflow(page);
  await page.goto("/admin/agents"); await expect(page.getByRole("heading", { name: "Боты", exact: true })).toBeVisible(); await expectNoOverflow(page);
});

test("non-bot product has no write controls", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL); state.products = [adminProductFixture(101, 99)];
  await page.goto("/admin/products/101");
  await expect(page.getByText(/Владелец не входит в список ботов/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Сохранить изменения", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Заблокировать", exact: true })).toHaveCount(0);
});
