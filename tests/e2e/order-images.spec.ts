import { expect, test } from "@playwright/test";
import { fulfillJson, orderFixture, png, setupMobileAccount } from "./helpers/mobileAccount";

for (const role of ["purchase", "sales"] as const) test(`${role}: ORDER images use authorization, neutral labels and no public fallback after 403`, async ({ page, baseURL }) => {
  const state = await setupMobileAccount(page, baseURL);
  const order = { ...orderFixture(1, "BOOKED", 1), images: [55, 55], histories: [] };
  state[role === "purchase" ? "customerOrders" : "sellerOrders"] = [order];
  const reads: string[] = [];
  let allowed = false;
  await page.route("**/images?ids=*", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    reads.push(route.request().headers().authorization ?? "");
    return fulfillJson(route, allowed ? [
      { fileName: "not-proof.png", contentType: "image/png", imageData: png },
      { contentType: "text/html", imageData: "PHNjcmlwdD4=" },
      { contentType: "image/png", imageData: "invalid!" },
    ] : { message: "Forbidden" }, allowed ? 200 : 403);
  });
  await page.goto(`/dashboard/${role}`);
  await page.getByRole("button", { name: "Подробнее о заказе №1", exact: true }).first().click();
  const images = page.getByTestId("order-images");
  await expect(images.getByText("Изображения заказа", { exact: true })).toBeVisible();
  await expect(images.getByText("Не удалось загрузить изображения заказа.", { exact: true })).toBeVisible();
  expect(reads).toHaveLength(1);
  expect(reads[0]).toMatch(/^Bearer /);
  await expect(images.getByRole("img")).toHaveCount(0);
  await expect(page.getByRole("dialog").getByText(/Подтверждение оплаты|не приложено/)).toHaveCount(0);
  allowed = true;
  await images.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(images.getByRole("img", { name: "Изображения заказа #1 1", exact: true })).toBeVisible();
  expect(reads).toHaveLength(2);
  expect(reads.every(header => header.startsWith("Bearer "))).toBe(true);
});

test("local ORDER selection can be replaced and removed without requests and releases previews", async ({ page, baseURL }) => {
  const state = await setupMobileAccount(page, baseURL);
  state.customerOrders = [orderFixture(1, "AWAITING_PAYMENT", 1)];
  await page.route("**/accounts/participant/10", route => fulfillJson(route, [{ id: 1, participantId: 10, username: "Seller", entityValue: "TEST", transferMoney: "BANK_CARD", comment: "" }]));
  const writes: string[] = [];
  page.on("request", request => { if (["POST", "DELETE"].includes(request.method()) && request.url().includes("/images")) writes.push(request.url()); });
  await page.addInitScript(() => {
    const created: string[] = [], revoked: string[] = [];
    Object.assign(window, { proofPreviewUrls: { created, revoked } });
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = value => { const url = create(value); created.push(url); return url; };
    URL.revokeObjectURL = url => { revoked.push(url); revoke(url); };
  });
  await page.goto("/dashboard/purchase");
  await page.getByRole("button", { name: "Подтвердить оплату", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  for (const name of ["first.png", "second.png"]) {
    await dialog.locator('input[type="file"]').setInputFiles({ name, mimeType: "image/png", buffer: Buffer.from(png, "base64") });
    await expect(dialog.getByText("Файл выбран", { exact: true })).toBeVisible();
  }
  await dialog.getByRole("button", { name: "Удалить выбранный файл", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Подтвердить оплату", exact: true })).toBeDisabled();
  expect(writes).toEqual([]);
  await expect.poll(() => page.evaluate(() => {
    const state = (window as unknown as { proofPreviewUrls: { created: string[]; revoked: string[] } }).proofPreviewUrls;
    return state.created.every(url => state.revoked.includes(url));
  })).toBe(true);
});

for (const change of ["order", "status", "logout"] as const) test(`late ORDER upload after ${change} cannot send a status mutation or populate another form`, async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 393, height: 900 });
  const state = await setupMobileAccount(page, baseURL);
  state.customerOrders = [orderFixture(31, "AWAITING_PAYMENT", 1)];
  await page.route("**/accounts/participant/10", route => fulfillJson(route, [{ id: 1, participantId: 10, username: "Seller", entityValue: "TEST", transferMoney: "BANK_CARD", comment: "" }]));
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let uploads = 0, completed = false;
  const statusWrites: string[] = [], deletes: string[] = [];
  page.on("request", request => {
    if (request.method() === "POST" && /\/order\/\d+\/ASSEMBLING/.test(request.url())) statusWrites.push(request.url());
    if (request.method() === "DELETE" && request.url().includes("/images")) deletes.push(request.url());
  });
  await page.route("**/images?tag=ORDER&entityId=31", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    uploads++; await gate;
    await fulfillJson(route, [99]).catch(() => {}); completed = true;
  });
  await page.goto("/dashboard/purchase");
  await page.getByRole("button", { name: "Подтвердить оплату", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('input[type="file"]').setInputFiles({ name: "proof.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
  await dialog.getByRole("button", { name: "Подтвердить оплату", exact: true }).click();
  await expect.poll(() => uploads).toBe(1);
  try {
    if (change === "logout") {
      await page.getByRole("button", { name: "Выход", exact: true, includeHidden: true }).evaluate(button => (button as HTMLButtonElement).click());
      await expect(page).toHaveURL(/\/auth\/login/);
    } else {
      if (change === "order") state.customerOrders = [orderFixture(32, "AWAITING_PAYMENT", 1)];
      else state.customerOrders[0].actualStatus = "DISPUTED";
      await page.clock.setFixedTime(new Date(await page.evaluate(() => Date.now()) + 180_000));
      await page.evaluate(() => { window.dispatchEvent(new Event("offline")); window.dispatchEvent(new Event("online")); });
      if (change === "order") {
        await expect(dialog).toBeHidden();
        await page.getByRole("button", { name: "Подтвердить оплату", exact: true }).click();
        await expect(page.getByRole("dialog").getByRole("button", { name: "Подтвердить оплату", exact: true })).toBeDisabled();
      } else await expect(dialog.getByText(/Статус заказа уже обновился/)).toBeVisible();
    }
  } finally { release(); }
  await expect.poll(() => completed).toBe(true);
  expect(statusWrites).toEqual([]);
  expect(deletes).toEqual([]);
  if (change === "order") await expect(page.getByRole("dialog").getByText("Изображение загружено", { exact: true })).toHaveCount(0);
});
