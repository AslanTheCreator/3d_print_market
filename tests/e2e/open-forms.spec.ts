import { expect, test, type Locator, type Page } from "@playwright/test";
import { setupAdmin } from "./helpers/admin";
import { fulfillJson, orderFixture, png, setupMobileAccount } from "./helpers/mobileAccount";

test.setTimeout(60_000);
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
};
async function reconnect(page: Page) {
  await page.clock.setFixedTime(new Date(await page.evaluate(() => Date.now()) + 180_000));
  await page.evaluate(() => {
    window.dispatchEvent(new Event("offline"));
    window.dispatchEvent(new Event("online"));
  });
}
async function tryPendingClose(page: Page, dialog: Locator, closeName: string) {
  await expect(dialog.getByRole("button", { name: closeName })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await page.locator(".MuiDialog-container").last().click({ position: { x: 1, y: 1 } });
  await expect(dialog).toBeVisible();
}

for (const width of [393, 1280]) {
  test(`payment draft survives reconnect failure and retry at ${width}px`, async ({ page, baseURL }) => {
    await page.setViewportSize({ width, height: 900 });
    const state = await setupMobileAccount(page, baseURL);
    state.customerOrders = [orderFixture(1, "AWAITING_PAYMENT", 1)];
    await page.route("**/accounts/participant/10", route => fulfillJson(route, [{ id: 1, participantId: 10, username: "Получатель", entityValue: "TEST", transferMoney: "BANK_CARD", comment: "" }]));
    const writes: string[] = [];
    await page.route("**/order/1/ASSEMBLING?*", route => {
      if (route.request().method() !== "OPTIONS") writes.push(route.request().url());
      return fulfillJson(route, 1);
    });
    await page.goto("/dashboard/purchase");
    await page.getByRole("button", { name: "Подтвердить оплату", exact: true }).first().click();
    const dialog = page.getByRole("dialog");
    const comment = dialog.getByLabel("Комментарий (необязательно)");
    await comment.fill("Сохранённый комментарий");
    await dialog.locator('input[type="file"]').setInputFiles({ name: "proof.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
    const confirm = dialog.getByRole("button", { name: "Подтвердить оплату", exact: true });
    await expect(confirm).toBeEnabled();
    state.ordersStatus = 403;
    await reconnect(page);
    await expect(dialog.getByText(/Подтверждение недоступно до успешной загрузки/)).toBeVisible();
    await expect(comment).toHaveValue("Сохранённый комментарий");
    await expect(dialog.getByText("Изображение загружено", { exact: true })).toBeVisible();
    await expect(confirm).toBeDisabled();
    await confirm.evaluate(button => button.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(writes).toEqual([]);
    state.ordersStatus = 200;
    await dialog.getByRole("button", { name: "Повторить загрузку", exact: true }).click();
    await expect(confirm).toBeEnabled();
    await expect(comment).toHaveValue("Сохранённый комментарий");
    await expect(dialog.getByText("Изображение загружено", { exact: true })).toBeVisible();
    await confirm.click();
    await expect(dialog).toBeHidden();
    expect(writes).toHaveLength(1);
    const url = new URL(writes[0]);
    expect(url.searchParams.get("imageId")).toBe("77");
    expect(url.searchParams.get("comment")).toBe("Сохранённый комментарий");
  });
}

for (const status of [200, 409]) test(`pending payment settles after failed background read: HTTP ${status}`, async ({ page, baseURL }) => {
  const state = await setupMobileAccount(page, baseURL);
  state.customerOrders = [orderFixture(1, "AWAITING_PAYMENT", 1)];
  await page.route("**/accounts/participant/10", route => fulfillJson(route, [{ id: 1, participantId: 10, username: "Получатель", entityValue: "TEST", transferMoney: "BANK_CARD", comment: "" }]));
  const gate = deferred();
  let writes = 0;
  await page.route("**/order/1/ASSEMBLING?*", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    writes++;
    await gate.promise;
    return fulfillJson(route, status === 200 ? 1 : { code: "ORDER_STATUS_CONFLICT", message: "Отказ оплаты" }, status);
  });
  await page.goto("/dashboard/purchase");
  await page.getByRole("button", { name: "Подтвердить оплату", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Комментарий (необязательно)").fill("Pending draft");
  await dialog.locator('input[type="file"]').setInputFiles({ name: "proof.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
  await expect(dialog.getByRole("button", { name: "Подтвердить оплату", exact: true })).toBeEnabled();
  await dialog.getByRole("button", { name: "Подтвердить оплату", exact: true }).click();
  try {
    await expect.poll(() => writes).toBe(1);
    state.ordersStatus = 403;
    await reconnect(page);
    await expect(dialog.getByText(/Подтверждение недоступно до успешной загрузки/)).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Подтверждение...", exact: true })).toBeDisabled();
    await expect(dialog.getByLabel("Комментарий (необязательно)")).toHaveValue("Pending draft");
  } finally { gate.resolve(); }
  if (status === 200) await expect(dialog).toBeHidden();
  else {
    await expect(dialog.getByText("Отказ оплаты", { exact: true })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Подтвердить оплату", exact: true })).toBeDisabled();
    state.ordersStatus = 200;
    await dialog.getByRole("button", { name: "Повторить загрузку", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "Подтвердить оплату", exact: true })).toBeEnabled();
    await expect(dialog.getByLabel("Комментарий (необязательно)")).toHaveValue("Pending draft");
  }
  expect(writes).toBe(1);
});

for (const malformed of [false, true]) test(`dirty admin form retains its baseline after ${malformed ? "invalid relations" : "refetch failure"}`, async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL);
  await page.goto("/admin/products/101");
  const name = page.getByLabel("Название", { exact: true });
  await name.fill("Несохранённое название");
  if (malformed) await page.route("**/product/101", route => fulfillJson(route, { ...state.products[0], categories: null, imageIds: [77] }));
  else state.relationsStatus = 403;
  await reconnect(page);
  await expect(page.getByText(/Сохранение заблокировано/)).toBeVisible();
  await expect(name).toHaveValue("Несохранённое название");
  await expect(page.getByRole("button", { name: "Сохранить изменения", exact: true })).toBeDisabled();
  await name.evaluate(input => input.closest("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(state.writes).toHaveLength(0);
  if (malformed) await page.unroute("**/product/101");
  state.relationsStatus = 200;
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(page.getByRole("button", { name: "Сохранить изменения", exact: true })).toBeEnabled();
  await expect(name).toHaveValue("Несохранённое название");
  await page.getByRole("button", { name: "Сохранить изменения", exact: true }).click();
  await expect(page.getByText("Изменения сохранены", { exact: true })).toBeVisible();
  expect(state.writes[0].body).toMatchObject({ name: "Несохранённое название", categoryIds: [1], imageIds: [77] });
});

test("initial admin profile failure blocks the tree until retry succeeds", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL);
  state.profileStatus = 500;
  await page.goto("/admin/products/101");
  await expect(page.getByRole("button", { name: "Повторить", exact: true })).toBeVisible();
  await expect(page.getByLabel("Название", { exact: true })).toHaveCount(0);
  expect(state.reads.filter(path => path.startsWith("/admin/"))).toEqual([]);
  state.profileStatus = 200;
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(page.getByLabel("Название", { exact: true })).toHaveValue(state.products[0].name);
});

test("dirty admin editor survives profile reconnect failure and successful retry without remount", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL);
  const uploads: string[] = [];
  page.on("request", request => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/images") uploads.push(request.url());
  });
  await page.goto("/admin/products/101");
  const name = page.getByLabel("Название", { exact: true });
  await name.fill("Несохранённое название после reconnect");
  const originalForm = await name.evaluateHandle(input => input.closest("form")!);
  const save = page.getByRole("button", { name: "Сохранить изменения", exact: true, includeHidden: true });
  state.profileStatus = 500;
  await reconnect(page);
  await expect(page.getByText(/Не удалось проверить доступ/)).toBeVisible();
  await expect(name).toHaveValue("Несохранённое название после reconnect");
  await expect(save).toBeDisabled();
  expect(await originalForm.evaluate(form => form.isConnected)).toBe(true);
  await name.evaluate(input => {
    input.closest("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    input.closest("form")!.querySelector<HTMLButtonElement>('button[type="submit"]')!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    const fileInput = input.closest("form")!.querySelector<HTMLInputElement>('input[type="file"]')!;
    const files = new DataTransfer();
    files.items.add(new File(["test"], "blocked.png", { type: "image/png" }));
    fileInput.files = files.files;
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(state.writes).toHaveLength(0);
  expect(uploads).toHaveLength(0);

  const retry = deferred();
  await page.route("**/auth/profile", async route => {
    if (route.request().method() === "GET") await retry.promise;
    await route.fallback();
  });
  state.profileStatus = 200;
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  try {
    await expect(name).toHaveValue("Несохранённое название после reconnect");
    await expect(save).toBeDisabled();
    expect(await originalForm.evaluate(form => form.isConnected)).toBe(true);
  } finally { retry.resolve(); }
  await expect(save).toBeEnabled();
  await expect(page.getByText(/Не удалось проверить доступ/)).toHaveCount(0);
  await expect(name).toHaveValue("Несохранённое название после reconnect");
  expect(await originalForm.evaluate(form => form.isConnected)).toBe(true);
  await save.click();
  await expect(page.getByText("Изменения сохранены", { exact: true })).toBeVisible();
  expect(state.writes).toHaveLength(1);
  expect(state.writes[0].body).toMatchObject({ name: "Несохранённое название после reconnect", categoryIds: [1], imageIds: [77] });
  await originalForm.dispose();
});

for (const status of [200, 409]) test(`pending admin save settles after profile reconnect failure: HTTP ${status}`, async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL);
  const gate = deferred();
  await page.route("**/admin/actions/agents/2/products/101", async route => {
    if (route.request().method() === "PUT") await gate.promise;
    await route.fallback();
  });
  state.saveStatus = status;
  await page.goto("/admin/products/101");
  const name = page.getByLabel("Название", { exact: true });
  await name.fill("Название pending-записи");
  const originalForm = await name.evaluateHandle(input => input.closest("form")!);
  await page.getByRole("button", { name: "Сохранить изменения", exact: true }).click();
  try {
    await expect(name).toBeDisabled();
    state.profileStatus = 500;
    await reconnect(page);
    await expect(page.getByText(/Не удалось проверить доступ/)).toBeVisible();
    await expect(name).toHaveValue("Название pending-записи");
    expect(await originalForm.evaluate(form => form.isConnected)).toBe(true);
  } finally { gate.resolve(); }
  await expect(page.getByText(status === 200 ? "Изменения сохранены" : "Конфликт данных", { exact: true })).toBeVisible();
  expect(state.writes).toHaveLength(1);
  const save = page.getByRole("button", { name: "Сохранить изменения", exact: true, includeHidden: true });
  await expect(save).toBeDisabled();
  await name.evaluate(input => input.closest("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(state.writes).toHaveLength(1);
  state.profileStatus = 200;
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(save).toBeEnabled();
  await expect(name).toHaveValue("Название pending-записи");
  expect(await originalForm.evaluate(form => form.isConnected)).toBe(true);
  expect(state.writes).toHaveLength(1);
  await originalForm.dispose();
});

test("profile reconnect failure blocks actions in an already open admin portal", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL);
  await page.goto("/admin/products/101");
  await page.getByRole("button", { name: "Заблокировать", exact: true }).click();
  const dialog = page.getByRole("dialog", { includeHidden: true }).filter({ has: page.getByRole("heading", { name: "Заблокировать товар?", exact: true, includeHidden: true }) });
  await expect(dialog).toBeVisible();
  state.profileStatus = 500;
  await reconnect(page);
  await expect(page.getByText(/Не удалось проверить доступ/)).toBeVisible();
  await dialog.getByRole("button", { name: "Подтвердить", exact: true, includeHidden: true }).evaluate(button => button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
  await expect(dialog).toBeVisible();
  expect(state.writes).toHaveLength(0);
  state.profileStatus = 200;
  await page.getByRole("button", { name: "Повторить", exact: true, includeHidden: true }).click();
  await expect(page.getByText(/Не удалось проверить доступ/)).toHaveCount(0);
  await dialog.getByRole("button", { name: "Подтвердить", exact: true }).click();
  await expect(page.getByText("Статус товара обновлён", { exact: true })).toBeVisible();
  expect(state.writes).toHaveLength(1);
});

test("profile retry with revoked admin role blocks the retained editor", async ({ page, baseURL }) => {
  const state = await setupAdmin(page, baseURL);
  await page.goto("/admin/products/101");
  await page.getByLabel("Название", { exact: true }).fill("Несохранённое название");
  state.profileStatus = 500;
  await reconnect(page);
  await expect(page.getByText(/Не удалось проверить доступ/)).toBeVisible();
  state.role = "USER";
  state.profileStatus = 200;
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(page.getByText("Доступ разрешён только администратору.")).toBeVisible();
  await expect(page.getByLabel("Название", { exact: true })).toHaveCount(0);
  expect(state.writes).toHaveLength(0);
});

for (const review of [false, true]) test(`${review ? "review" : "cancel"} guards every pending close and keeps failed input for retry`, async ({ page, baseURL }) => {
  const state = await setupMobileAccount(page, baseURL);
  state.customerOrders = [orderFixture(1, review ? "COMPLETED" : "BOOKED", 1)];
  const gate = deferred();
  const writes: Record<string, unknown>[] = [];
  await page.route(review ? "**/reviews" : "**/order/1/CANCELLED", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    writes.push(route.request().postDataJSON());
    if (writes.length === 1) await gate.promise;
    return fulfillJson(route, writes.length === 1 ? { code: "REJECTED", message: "Отказ записи" } : 1, writes.length === 1 ? 409 : 200);
  });
  await page.goto("/dashboard/purchase");
  await page.getByRole("button", { name: review ? "Оставить отзыв" : "Отменить", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  const input = review ? dialog.getByPlaceholder("Расскажите о своих впечатлениях...") : dialog.getByLabel("Причина отмены");
  await input.fill("Текст для повторной попытки");
  if (review) {
    const rating = dialog.locator('input[value="5"]');
    await rating.focus();
    await page.keyboard.press("Space");
    await expect(rating).toBeChecked();
  }
  const submit = review ? "Отправить отзыв" : "Отменить заказ";
  await dialog.getByRole("button", { name: submit, exact: true }).click();
  try {
    await expect.poll(() => writes.length).toBe(1);
    await tryPendingClose(page, dialog, review ? "Закрыть окно отзыва" : "Закрыть окно отмены заказа");
    await expect(input).toHaveValue("Текст для повторной попытки");
  } finally { gate.resolve(); }
  await expect(dialog.getByRole("button", { name: submit, exact: true })).toBeEnabled();
  await expect(input).toHaveValue("Текст для повторной попытки");
  await dialog.getByRole("button", { name: submit, exact: true }).click();
  if (review) await expect(dialog.getByText("Спасибо за отзыв!", { exact: true })).toBeVisible();
  else await expect(dialog).toBeHidden();
  expect(writes).toHaveLength(2);
  expect(writes[0]).toEqual(writes[1]);
  if (!review) expect(writes[0]).toEqual({ closureReason: "Текст для повторной попытки", comment: "Текст для повторной попытки" });
});

for (const role of ["purchase", "sales"] as const) {
  test(`${role}: cancellation sends only the new body, joins reason and comment, and locks double submit`, async ({ page, baseURL }) => {
    const state = await setupMobileAccount(page, baseURL);
    const orders = [orderFixture(1, "BOOKED", 1)];
    state[role === "purchase" ? "customerOrders" : "sellerOrders"] = orders;
    const gate = deferred();
    const writes: { url: string; body: unknown }[] = [];
    const oldRequests: string[] = [];
    page.on("request", request => { if (/\/order\/.*(?:\/FAILED|\/dispute\/COMPLETED)/.test(request.url())) oldRequests.push(request.url()); });
    await page.route("**/order/1/CANCELLED", async route => {
      if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
      writes.push({ url: route.request().url(), body: route.request().postDataJSON() });
      await gate.promise;
      orders[0].actualStatus = "CANCELLED";
      return fulfillJson(route, 1);
    });
    await page.goto(`/dashboard/${role}`);
    await page.getByRole("button", { name: "Отменить", exact: true }).first().click();
    const dialog = page.getByRole("dialog");
    const reason = role === "purchase" ? "Передумал покупать" : "Товар закончился";
    await dialog.getByRole("button", { name: reason, exact: true }).click();
    await dialog.getByLabel("Дополнительный комментарий (необязательно)").fill("  Дополнительная причина  ");
    const submit = dialog.getByRole("button", { name: "Отменить заказ", exact: true });
    await submit.evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
    try {
      await expect.poll(() => writes.length).toBe(1);
      await expect(dialog.getByRole("button", { name: "Отмена...", exact: true })).toBeDisabled();
    } finally { gate.resolve(); }
    await expect(dialog).toBeHidden();
    expect(writes).toEqual([{ url: "http://127.0.0.1:9/order/1/CANCELLED", body: { closureReason: reason, comment: `${reason}\n\nДополнительная причина` } }]);
    expect(oldRequests).toEqual([]);
    expect(state.ordersReads).toBeGreaterThanOrEqual(2);
  });

  test(`${role}: current non-BOOKED status blocks an already open cancellation dialog`, async ({ page, baseURL }) => {
    await page.setViewportSize({ width: 393, height: 900 });
    const state = await setupMobileAccount(page, baseURL);
    const orders = [orderFixture(1, "BOOKED", 1)];
    state[role === "purchase" ? "customerOrders" : "sellerOrders"] = orders;
    const writes: string[] = [];
    page.on("request", request => { if (request.method() === "POST" && request.url().includes("/order/")) writes.push(request.url()); });
    await page.goto(`/dashboard/${role}`);
    await page.getByRole("button", { name: "Отменить", exact: true }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Причина отмены").fill("Сохранить причину");
    orders[0].actualStatus = "AWAITING_PAYMENT";
    await reconnect(page);
    await expect(dialog.getByText(/Статус заказа изменился/)).toBeVisible();
    const submit = dialog.getByRole("button", { name: "Отменить заказ", exact: true });
    await expect(submit).toBeDisabled();
    await submit.evaluate(button => button.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await expect(dialog.getByLabel("Причина отмены")).toHaveValue("Сохранить причину");
    expect(writes).toEqual([]);
  });
}

for (const applied of [false, true]) test(`lost cancellation response: applied=${applied}, GET confirms result without another POST`, async ({ page, baseURL }) => {
  const state = await setupMobileAccount(page, baseURL);
  state.customerOrders = [orderFixture(1, "BOOKED", 1)];
  let writes = 0;
  await page.route("**/order/1/CANCELLED", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    writes++;
    if (applied) state.customerOrders[0].actualStatus = "CANCELLED";
    return route.abort("connectionfailed");
  });
  await page.goto("/dashboard/purchase");
  await page.getByRole("button", { name: "Отменить", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Причина отмены").fill("Оплата не нужна");
  await dialog.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  if (!applied) {
    await expect(dialog.getByText(/Результат отмены не подтверждён/)).toBeVisible();
    await expect(dialog.getByLabel("Причина отмены")).toHaveValue("Оплата не нужна");
    await expect(dialog.getByRole("button", { name: "Отменить заказ", exact: true })).toBeDisabled();
    await dialog.getByRole("button", { name: "Проверить результат", exact: true }).click();
    await expect(dialog.getByText(/Результат отмены не подтверждён/)).toBeVisible();
    state.customerOrders[0].actualStatus = "CANCELLED";
    await dialog.getByRole("button", { name: "Проверить результат", exact: true }).click();
  }
  await expect(dialog).toBeHidden();
  expect(writes).toBe(1);
  expect(state.ordersReads).toBeGreaterThanOrEqual(2);
});

test("accepted cancellation remains successful when list refresh fails", async ({ page, baseURL }) => {
  const state = await setupMobileAccount(page, baseURL);
  state.customerOrders = [orderFixture(1, "BOOKED", 1)];
  let writes = 0;
  await page.route("**/order/1/CANCELLED", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    writes++; state.ordersStatus = 403;
    return fulfillJson(route, 1);
  });
  await page.goto("/dashboard/purchase");
  await page.getByRole("button", { name: "Отменить", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Причина отмены").fill("Отказ от покупки");
  await dialog.getByRole("button", { name: "Отменить заказ", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Заказ успешно отменён", { exact: true })).toBeVisible();
  await expect(page.getByText(/Не удалось обновить заказы/)).toBeVisible();
  expect(writes).toBe(1);
});

test("review reopen before close transition finishes cannot reset new input", async ({ page, baseURL }) => {
  const state = await setupMobileAccount(page, baseURL);
  state.customerOrders = [orderFixture(1, "COMPLETED", 1)];
  await page.goto("/dashboard/purchase");
  const open = page.getByRole("button", { name: "Оставить отзыв", exact: true }).first();
  await open.click();
  const dialog = page.getByRole("dialog");
  await dialog.getByPlaceholder("Расскажите о своих впечатлениях...").fill("Старый текст");
  // Оба события в одном browser task: заведомо быстрее старого reset timer.
  await page.evaluate(() => {
    (document.querySelector('[aria-label="Закрыть окно отзыва"]') as HTMLButtonElement).click();
    Array.from(document.querySelectorAll("button")).find(button => button.textContent?.trim() === "Оставить отзыв")!.click();
  });
  await expect(dialog).toBeVisible();
  const input = dialog.getByPlaceholder("Расскажите о своих впечатлениях...");
  await input.fill("Новый текст");
  await page.waitForTimeout(400);
  await expect(input).toHaveValue("Новый текст");
});
