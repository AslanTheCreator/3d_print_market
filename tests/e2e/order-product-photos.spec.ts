import { expect, test, type Locator, type Page } from "@playwright/test";
import { adminOrderFixture, setupAdmin } from "./helpers/admin";
import { mockGuestAuth } from "./helpers/guestAuth";
import { expectNoOverflow, fulfillJson, image, orderFixture, png, setupMobileAccount } from "./helpers/mobileAccount";

const thumbnail = (id: number) => `/__test/order-product-photo/${id}.png`;

async function mockPhotos(page: Page) {
  const state = {
    status: 200,
    batches: [] as string[],
    protectedReads: [] as { ids: string | null; authorization?: string }[],
    productReads: [] as string[],
  };
  page.on("request", request => {
    if (request.method() !== "GET") return;
    const url = new URL(request.url());
    if (url.pathname.startsWith("/product/")) state.productReads.push(url.pathname);
    if (url.pathname === "/images") {
      state.protectedReads.push({ ids: url.searchParams.get("ids"), authorization: request.headers().authorization });
    }
  });
  await page.route("**/images/metadata?*", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, []);
    const ids = new URL(route.request().url()).searchParams.get("ids") ?? "";
    state.batches.push(ids);
    return fulfillJson(route, state.status === 200
      ? [504, 502, 501].filter(id => ids.split(",").includes(String(id))).map(id => ({
        ...image, id, thumbnailUrl: thumbnail(id),
      }))
      : { message: "Metadata unavailable" }, state.status);
  });
  await page.route("**/__test/order-product-photo/*.png", route =>
    route.request().url().endsWith("/504.png")
      ? route.fulfill({ status: 404 })
      : route.fulfill({ contentType: "image/png", body: Buffer.from(png, "base64") }));
  return state;
}

async function expectPhoto(scope: Page | Locator, name: string, id: number) {
  const photo = scope.getByRole("img", { name, exact: true }).first();
  await expect(photo).toBeVisible();
  await expect(photo).toHaveAttribute("src", thumbnail(id));
  await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
}

for (const [section, endpoint] of [["purchase", "customer"], ["sales", "seller"]] as const) {
  test(`${endpoint} orders retain product photos on desktop and mobile`, async ({ page, baseURL }) => {
    await setupMobileAccount(page, baseURL);
    const photos = await mockPhotos(page);
    const order = orderFixture(201, "BOOKED", 1);
    await page.route(`**/order/${endpoint}`, route => fulfillJson(route, [
      { ...order, product: { ...order.product, name: "Фигурка из заказа", imageId: 501 } },
      { ...order, orderId: 202, images: [901], paymentProofImageId: 901,
        product: { ...order.product, name: "Товар с чеком без фото", imageId: null } },
    ]));
    await page.goto(`/dashboard/${section}`);
    await expectPhoto(page.getByTestId("desktop-orders"), "Фигурка из заказа", 501);
    await page.setViewportSize({ width: 390, height: 844 });
    const card = page.getByRole("article", { name: "Заказ №201", exact: true });
    await expectPhoto(card, "Фигурка из заказа", 501);
    const noPhoto = page.getByRole("article", { name: "Заказ №202", exact: true });
    await expect(noPhoto.getByRole("img", { name: "Нет фото" })).toBeVisible();
    await expect(noPhoto.getByText("Товар с чеком без фото", { exact: true })).toBeVisible();
    expect(photos.batches).toEqual(["501"]);
    expect(photos.productReads).toEqual([]);
  });
}

for (const [path, ordersEndpoint] of [
  ["/admin/orders", "/admin/actions/agent-orders"],
  ["/admin/agents/2?tab=orders", "/admin/actions/agents/2/orders"],
] as const) {
  test(`${path} shares page metadata between desktop, mobile and details`, async ({ page, baseURL }) => {
    await setupAdmin(page, baseURL);
    const photos = await mockPhotos(page);
    const order = adminOrderFixture();
    const rows = [
      ["Снимок товара A", 501],
      ["Снимок товара B", 502],
      ["Повтор фото A", 501],
      ["Нет записи metadata", 503],
      ["Файл недоступен", 504],
      ["Снимок без фото", null],
    ] as const;
    const pageOne = Array.from({ length: 50 }, (_, index) => {
      const [name, imageId] = rows[index] ?? [`Товар ${index}`, 501];
      return {
        ...order, orderId: 201 + index, images: imageId === null ? [901] : [],
        paymentProofImageId: imageId === null ? 902 : null,
        caseImages: imageId === null ? [903] : [],
        product: { ...order.product, name, imageId },
      };
    });
    const reads: string[] = [];
    await page.route(url => url.pathname === ordersEndpoint, route => {
      if (route.request().method() === "OPTIONS") return fulfillJson(route, []);
      const url = new URL(route.request().url());
      reads.push(url.search);
      return fulfillJson(route, url.searchParams.get("page") === "1"
        ? pageOne.slice(0, rows.length).map(item => ({ ...item, orderId: item.orderId + 100 }))
        : pageOne);
    });
    await page.goto(path);
    const table = page.getByRole("table", { name: "Заказы ботов" });
    await expectPhoto(table, "Снимок товара A", 501);
    await expectPhoto(table, "Снимок товара B", 502);
    await expectPhoto(table, "Повтор фото A", 501);
    for (const name of ["Нет записи metadata", "Файл недоступен", "Снимок без фото"]) {
      const row = table.getByRole("row").filter({ hasText: name });
      await expect(row.getByRole("img", { name: "Нет фото" })).toBeVisible();
      await expect(row.getByText("2 шт.", { exact: true })).toBeVisible();
      await expect(row.getByText("4 500,00 ₽", { exact: true })).toBeVisible();
    }

    const detail = page.getByRole("dialog", { name: "Детали заказа", exact: true });
    await page.getByRole("button", { name: "Открыть заказ #201", exact: true }).click();
    await expectPhoto(detail, "Снимок товара A", 501);
    await detail.getByRole("button", { name: "Открыть фото товара: Снимок товара A" }).press("Enter");
    const gallery = page.getByRole("dialog", { name: "Полноэкранная галерея изображений товара" });
    await expect(gallery.getByRole("img", { name: "Снимок товара A 1" })).toHaveAttribute("src", image.originalUrl);
    await gallery.getByRole("button", { name: "Закрыть полноэкранную галерею" }).click();
    await detail.getByRole("button", { name: "Закрыть", exact: true }).click();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(table).toHaveCount(0);
    await expectPhoto(page, "Снимок товара B", 502);
    await page.getByRole("button", { name: "Открыть заказ #201", exact: true }).click();
    await expectPhoto(detail, "Снимок товара A", 501);
    await detail.getByRole("button", { name: "Закрыть", exact: true }).click();
    await page.getByRole("button", { name: "Открыть заказ #206", exact: true }).click();
    await expect(detail.getByRole("img", { name: "Нет фото" })).toBeVisible();
    await expect(detail.getByRole("img", { name: "payment.png" })).toBeVisible();
    await expect(detail.getByText("Снимок без фото", { exact: true })).toBeVisible();
    await expect(detail.getByText("Товары: 4 000,00 ₽")).toBeVisible();
    await expect(detail.getByText("Количество: 2", { exact: true })).toBeVisible();
    await expect(detail.getByRole("button", { name: "Подтвердить заказ", exact: true })).toBeEnabled();
    await expectNoOverflow(page);
    await detail.getByRole("button", { name: "Закрыть", exact: true }).click();

    await page.getByRole("button", { name: "Далее", exact: true }).click();
    await expect(page.getByRole("button", { name: "Открыть заказ #301", exact: true })).toBeVisible();
    await expectPhoto(page, "Снимок товара A", 501);
    await page.getByRole("button", { name: "Назад", exact: true }).click();
    await expect(page.getByRole("button", { name: "Открыть заказ #201", exact: true })).toBeVisible();
    await expectPhoto(page, "Снимок товара A", 501);
    expect(reads).toContain("?page=1&size=50&status=BOOKED");
    expect(photos.batches).toEqual(["501,502,503,504"]);
    expect(photos.protectedReads).toEqual([{ ids: "901", authorization: expect.stringMatching(/^Bearer /) }]);
    expect(photos.productReads).toEqual([]);
  });
}

test("admin metadata failure falls back and retry leaves the order list intact", async ({ page, baseURL }) => {
  await setupAdmin(page, baseURL);
  const photos = await mockPhotos(page);
  photos.status = 503;
  let orderReads = 0;
  const order = adminOrderFixture();
  await page.route("**/admin/actions/agent-orders?*", route => {
    if (route.request().method() !== "OPTIONS") orderReads++;
    return fulfillJson(route, [{ ...order, product: { ...order.product, imageId: 501 } }]);
  });
  await page.goto("/admin/orders");
  const table = page.getByRole("table", { name: "Заказы ботов" });
  await expect(table.getByRole("img", { name: "Нет фото" })).toBeVisible();
  await expect(table.getByText(order.product.name)).toBeVisible();
  expect(orderReads).toBe(1);
  const retry = page.getByRole("button", { name: "Повторить загрузку изображений" });
  await expect(retry).toBeVisible();
  photos.status = 200;
  await retry.click();
  await expectPhoto(table, order.product.name, 501);
  await expect(retry).toHaveCount(0);
  expect(orderReads).toBe(1);
});

test("catalog keeps a product with null imageId and requests metadata only for the other product", async ({ page }) => {
  await mockGuestAuth(page);
  const photos = await mockPhotos(page);
  const product = orderFixture(201, "BOOKED", 1).product;
  await page.route("**/products/find", route => fulfillJson(route, [
    { ...product, name: "Каталог без фото", imageId: null },
    { ...product, id: product.id + 1, name: "Каталог с фото", imageId: 501 },
  ]));
  await page.goto("/catalog/search?query=figure");
  await expect(page.getByText("Каталог без фото", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Каталог без фото/ })
    .getByRole("img", { name: "Изображение недоступно" })).toBeVisible();
  await expect(page.getByText("Каталог с фото", { exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Каталог с фото", exact: true })).toHaveAttribute("src", image.mediumUrl);
  expect(photos.batches).toEqual(["501"]);
});
