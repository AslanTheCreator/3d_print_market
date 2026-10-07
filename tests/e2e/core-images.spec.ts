import { expect, test, type Page } from "@playwright/test";
import { expectNoOverflow, fulfillJson, image, orderFixture, setupMobileAccount } from "./helpers/mobileAccount";

test.setTimeout(90_000);

async function setup(page: Page, baseURL?: string) {
  await setupMobileAccount(page, baseURL);
  const order = orderFixture(301, "BOOKED", 1);
  order.product.imageId = 77;
  order.product.name = "Товар Stage 15";
  const state = { imageStatus: 503, profileStatus: 200, avatarId: 88,
    reads: {} as Record<string, number>, metadata: [] as string[], productCount: 1 };
  await page.route("http://127.0.0.1:9/**", async route => {
    const url = new URL(route.request().url());
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    const path = url.pathname;
    if (!["/auth/profile", "/participant", "/products/my", "/products/find", "/order/customer", "/order/seller", "/images/metadata"].includes(path)) return route.fallback();
    state.reads[path] = (state.reads[path] ?? 0) + 1;
    if (path === "/images/metadata") {
      const ids = url.searchParams.get("ids") ?? "";
      state.metadata.push(ids);
      return fulfillJson(route, state.imageStatus === 200
        ? ids.split(",").map(id => ({ ...image, id: Number(id) }))
        : { message: "Metadata unavailable" }, state.imageStatus);
    }
    if (path === "/auth/profile") return fulfillJson(route, {
      id: 1, login: "core-user", fullName: "Core User", role: "USER", email: "test@example.com",
      imageId: state.avatarId, exp: 0, type: "access",
    }, state.profileStatus);
    if (path === "/participant") return fulfillJson(route, {
      id: 1, login: "core-user", fullName: "Core User", mail: "test@example.com", phoneNumber: "",
      status: "ACTIVE", sellerStatus: "DEFAULT", averageRating: 0, totalReviews: 0,
      imageId: state.avatarId, addresses: [], accounts: [], transfers: [], socialNetworks: [],
    });
    if (path.startsWith("/order/")) return fulfillJson(route, [order]);
    const products = Array.from({ length: state.productCount }, (_, index) => ({ ...order.product,
      id: index + 401, name: `Товар Stage 15 ${index + 1}`, count: 5,
      expirationDate: "2020-01-01T00:00:00Z", sellerId: index === 0 ? 1 : 2,
    }));
    if (path === "/products/my") {
      const { pageable } = route.request().postDataJSON() as { pageable: { size: number; lastId?: number } };
      const offset = pageable.lastId === undefined ? 0 : pageable.lastId - 400;
      return fulfillJson(route, products.slice(offset, offset + pageable.size));
    }
    return fulfillJson(route, products);
  });
  return state;
}

test("header reads core only and order image retry reuses the core cache", async ({ page, baseURL }) => {
  const state = await setup(page, baseURL);
  await page.goto("/about");
  await expect.poll(() => state.reads["/order/customer"]).toBe(1);
  await expect.poll(() => state.reads["/products/my"]).toBe(1);
  await expect(page.locator('a[href="/dashboard"]:visible').first()).toContainText("2");
  expect(state.metadata).toEqual([]);
  await page.locator('a[href="/dashboard"]:visible').first().click();
  await page.locator('a[href="/dashboard/purchase"]:visible').first().click();
  await expect(page.getByTestId("desktop-orders").getByText("Товар Stage 15").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Повторить загрузку изображений" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Нет фото" }).first()).toBeVisible();
  const reads = state.reads["/order/customer"];
  state.imageStatus = 200;
  await page.getByRole("button", { name: "Повторить загрузку изображений" }).click();
  await expect(page.getByTestId("desktop-orders").getByRole("img", { name: "Товар Stage 15" }).first()).toBeVisible();
  expect(state.reads["/order/customer"]).toBe(reads);
  expect(reads).toBe(1);
});

test("own product list and header share core data; image retry and local pagination keep it", async ({ page, baseURL }) => {
  const state = await setup(page, baseURL);
  state.productCount = 25;
  await page.goto("/about");
  await expect.poll(() => state.reads["/products/my"]).toBe(1);
  expect(state.metadata).toEqual([]);
  await page.locator('a[href="/dashboard"]:visible').first().click();
  await page.locator('a[href="/dashboard/products"]:visible').first().click();
  await expect(page.getByText("Товар Stage 15 12", { exact: true })).toBeVisible();
  await expect(page.getByText("Товар Stage 15 13", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Повторить загрузку изображений" })).toBeVisible();
  state.imageStatus = 200;
  await page.getByRole("button", { name: "Повторить загрузку изображений" }).click();
  await expect(page.getByRole("img", { name: "Товар Stage 15 1", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Загрузить ещё" }).click();
  await expect(page.getByText("Товар Stage 15 24", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Загрузить ещё" }).click();
  await expect(page.getByText("Товар Stage 15 25", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Загрузить ещё" })).toHaveCount(0);
  expect(state.reads["/products/my"]).toBe(1);
});

for (const width of [393, 1280]) {
test(`core participant remains editable after avatar failure at ${width}px and retry does not refetch it`, async ({ page, baseURL }) => {
  await page.setViewportSize({ width, height: 800 });
  const state = await setup(page, baseURL);
  await page.goto("/dashboard");
  await expect(page.getByTestId("profile-overview").getByText("core-user", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Повторить загрузку изображений" })).toBeVisible();
  await expectNoOverflow(page);
  await page.getByRole("button", { name: "Редактировать профиль", exact: true }).last().click();
  await page.getByLabel("Имя и фамилия", { exact: true }).fill("Новый ввод");
  await expect(page.getByRole("button", { name: "Повторить загрузку изображений" })).toBeVisible();
  state.imageStatus = 200;
  await page.getByRole("button", { name: "Повторить загрузку изображений" }).click();
  await expect(page.getByRole("button", { name: "Повторить загрузку изображений" })).toHaveCount(0);
  await expect(page.getByLabel("Имя и фамилия", { exact: true })).toHaveValue("Новый ввод");
  expect(state.reads["/participant"]).toBe(1);
});
}

test("own products continue through the core cursor after the cached first hundred", async ({ page, baseURL }) => {
  const state = await setup(page, baseURL);
  state.productCount = 105;
  state.imageStatus = 200;
  await page.goto("/dashboard/products");
  await expect(page.getByText("Товар Stage 15 12", { exact: true })).toBeVisible();
  for (const count of [24, 36, 48, 60, 72, 84, 96, 100]) {
    await page.getByRole("button", { name: "Загрузить ещё" }).click();
    await expect(page.getByText(`Товар Stage 15 ${count}`, { exact: true })).toBeVisible();
  }
  expect(state.reads["/products/my"]).toBe(1);
  await page.getByRole("button", { name: "Загрузить ещё" }).click();
  await expect(page.getByText("Товар Stage 15 105", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Загрузить ещё" })).toHaveCount(0);
  expect(state.reads["/products/my"]).toBe(2);
});

for (const profileStatus of [200, 503]) {
  test(`ownership checks depend on core profile (${profileStatus}), without avatar reads`, async ({ page, baseURL }) => {
    const state = await setup(page, baseURL);
    state.profileStatus = profileStatus;
    state.productCount = 2;
    await page.route("**/products/find", route => fulfillJson(route, [
      { ...orderFixture(1, "BOOKED", 1).product, id: 501, name: "Свой товар", sellerId: 1, imageId: 0 },
      { ...orderFixture(2, "BOOKED", 1).product, id: 502, name: "Чужой товар", sellerId: 2, imageId: 0 },
    ]));
    await page.goto("/catalog/search?query=товар");
    if (profileStatus === 200) {
      await expect(page.getByRole("button", { name: "Ваш товар" })).toBeDisabled();
      await expect(page.getByRole("button", { name: "Купить", exact: true })).toBeEnabled();
    } else {
      await expect(page.getByRole("button", { name: "Недоступно", exact: true }).first()).toBeDisabled();
    }
    expect(state.metadata).toEqual([]);
  });
}
