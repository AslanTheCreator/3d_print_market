import { expect, test } from "@playwright/test";
import { fulfillJson, orderFixture, setupMobileAccount } from "./helpers/mobileAccount";

const product = { ...orderFixture(1, "BOOKED", 1).product, id: 801, name: "Stage 18 фигурка", imageId: 0 };
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}
test.setTimeout(90_000);

test("infinite catalogue add updates the icon before POST settles and shows one failure with retry", async ({ page, baseURL }) => {
  await setupMobileAccount(page, baseURL);
  await page.route("**/products/find", route => fulfillJson(route, [product]));
  let favorites: typeof product[] = [];
  let reads = 0;
  let writes = 0;
  let fail = true;
  const gate = deferred();
  await page.route("http://127.0.0.1:9/favorites**", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    if (new URL(route.request().url()).pathname.endsWith("/find")) {
      reads++;
      return fulfillJson(route, favorites);
    }
    writes++;
    await gate.promise;
    if (fail) return fulfillJson(route, { code: "WRITE_FAILED", message: "Избранное временно недоступно" }, 500);
    favorites = [product];
    return fulfillJson(route, null);
  });
  await page.goto("/catalog/search?query=stage18");
  const add = page.getByRole("button", { name: "Добавить в избранное", exact: true });
  await expect(add).toBeVisible();
  await expect.poll(() => reads).toBe(1);
  await add.click();
  const optimistic = page.getByRole("button", { name: "Удалить из избранного", exact: true });
  await expect(optimistic).toHaveAttribute("aria-pressed", "true");
  await expect(optimistic).toBeDisabled();
  await expect.poll(() => writes).toBe(1);
  gate.resolve();
  const alert = page.getByRole("alert").filter({ hasText: "Не удалось изменить избранное: Избранное временно недоступно" });
  await expect(alert).toHaveCount(1);
  await expect(add).toBeEnabled();
  await expect(add).toHaveAttribute("aria-pressed", "false");
  await expect.poll(() => reads).toBe(2);
  await alert.getByRole("button").click();
  fail = false;
  await add.click();
  await expect(optimistic).toBeEnabled();
  await expect.poll(() => reads).toBe(3);
  expect(writes).toBe(2);
  await expect(page.locator(".MuiAlert-root")).toHaveCount(0);
});

test("favorite DELETE failure remains visible after optimistic card unmount and successful GET", async ({ page, baseURL }) => {
  await setupMobileAccount(page, baseURL);
  let favorites = [product];
  let fail = true;
  let writes = 0;
  let reads = 0;
  const gate = deferred();
  await page.route("http://127.0.0.1:9/favorites**", async route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
    if (new URL(route.request().url()).pathname.endsWith("/find")) {
      reads++;
      return fulfillJson(route, favorites);
    }
    writes++;
    await gate.promise;
    if (fail) return fulfillJson(route, { code: "WRITE_FAILED", message: "Удаление избранного отклонено" }, 500);
    favorites = [];
    return fulfillJson(route, null);
  });
  await page.goto("/favorites");
  const remove = page.getByRole("button", { name: "Удалить из избранного", exact: true });
  await expect(remove).toBeVisible();
  await remove.click();
  await expect(remove).toHaveCount(0);
  gate.resolve();
  const alert = page.getByRole("alert").filter({ hasText: "Не удалось изменить избранное: Удаление избранного отклонено" });
  await expect(alert).toHaveCount(1);
  await expect(remove).toBeEnabled();
  await expect.poll(() => reads).toBe(2);
  await alert.getByRole("button").click();
  fail = false;
  await remove.click();
  await expect.poll(() => reads).toBe(3);
  await expect(remove).toHaveCount(0);
  expect(writes).toBe(2);
  await expect(page.locator(".MuiAlert-root")).toHaveCount(0);
});

for (const consumer of ["checkout", "catalogue"] as const) {
  test(`${consumer}: cart DELETE failure + successful GET shows one error, clears pending and allows retry`, async ({ page, baseURL }) => {
    await setupMobileAccount(page, baseURL);
    await page.route("**/products/find", route => fulfillJson(route, [product]));
    await page.route("**/order?productId=*", route => fulfillJson(route, { addresses: [], sellerTransfers: [] }));
    let cart = [{ product, count: 1, availableCount: 2, enoughStock: true }];
    let reads = 0;
    let writes = 0;
    let fail = true;
    const gate = deferred();
    await page.route("**/basket**", async route => {
      if (route.request().method() === "OPTIONS") return fulfillJson(route, null);
      if (new URL(route.request().url()).pathname.endsWith("/find")) {
        reads++;
        return fulfillJson(route, cart);
      }
      expect(route.request().method()).toBe("DELETE");
      writes++;
      await gate.promise;
      if (fail) return fulfillJson(route, { code: "WRITE_FAILED", message: "Удаление корзины отклонено" }, 500);
      cart = [];
      return fulfillJson(route, null);
    });
    await page.goto(consumer === "checkout" ? "/checkout" : "/catalog/search?query=stage18");
    const remove = page.getByRole("button", { name: consumer === "checkout"
      ? `Удалить товар ${product.name} из корзины` : `Уменьшить количество ${product.name}`, exact: true });
    await expect(remove).toBeEnabled();
    await remove.click();
    await expect.poll(() => writes).toBe(1);
    gate.resolve();
    const alert = page.getByRole("alert").filter({ hasText: "Не удалось удалить товар из корзины: Удаление корзины отклонено" });
    await expect(alert).toHaveCount(1);
    await expect.poll(() => reads).toBe(2);
    await expect(remove).toBeEnabled();
    await alert.getByRole("button").click();
    fail = false;
    await remove.click();
    await expect.poll(() => reads).toBe(3);
    await expect(remove).toHaveCount(0);
    expect(writes).toBe(2);
    await expect(page.locator(".MuiAlert-root")).toHaveCount(0);
  });
}
