import { devices, expect, test, type Page } from "@playwright/test";
import type { ProductDto, ProductRequestModel, SortBy } from "@/entities/product";
import { mockGuestAuth } from "./helpers/guestAuth";
import { expectNoOverflow, fulfillJson, orderFixture } from "./helpers/mobileAccount";

const labels: Record<SortBy, string> = {
  DATE_DESC: "Сначала новые", DATE_ASC: "Сначала старые",
  PRICE_ASC: "Сначала дешевле", PRICE_DESC: "Сначала дороже",
  SELLER_RATING_ASC: "Рейтинг продавца: по возрастанию",
  SELLER_RATING_DESC: "Рейтинг продавца: по убыванию",
};
const product = orderFixture(1, "BOOKED", 1).product;
const select = (page: Page) => page.getByRole("combobox", { name: "Сортировка" });
const choose = async (page: Page, sortBy: SortBy) => {
  await select(page).click();
  await page.getByRole("option", { name: labels[sortBy], exact: true }).click();
};

async function mockCatalog(page: Page) {
  await mockGuestAuth(page);
  const bodies: ProductRequestModel[] = [];
  await page.route("**/products/find", route => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, []);
    const body: ProductRequestModel = route.request().postDataJSON();
    bodies.push(body);
    return fulfillJson(route, [{ ...product, name: `Выдача ${body.pageable.sortBy}`, sellerRating: null }]);
  });
  return bodies;
}

for (const viewport of ["desktop", "mobile"] as const) {
  test.describe(viewport, () => {
    test.use(viewport === "mobile" ? { viewport: devices["Pixel 5"].viewport, isMobile: true, hasTouch: true } : {});
    test("all six choices request the first page for the current search", async ({ page }) => {
      const bodies = await mockCatalog(page);
      await page.goto("/catalog/search?query=figure");
      for (const sortBy of Object.keys(labels) as SortBy[]) {
        if (sortBy !== "DATE_DESC") await choose(page, sortBy);
        await expect(page.getByText(`Выдача ${sortBy}`, { exact: true })).toBeVisible();
        await expect(select(page)).toHaveText(labels[sortBy]);
        expect(bodies.at(-1)).toEqual({ name: "figure", pageable: { size: 10, sortBy } });
      }
      expect(bodies).toHaveLength(6);
      await expectNoOverflow(page);
    });
  });
}

for (const [url, filters, size] of [
  ["/", {}, 18],
  ["/sellers/10", { participantId: 10 }, 12],
] as const) {
  test(`${url} retains its catalog scope when sorted`, async ({ page }) => {
    const bodies = await mockCatalog(page);
    await page.route("**/participants/find", route => fulfillJson(route, [{
      id: 10, login: "fixture-seller", fullName: "Seller", imageId: null,
      sellerStatus: "DEFAULT", averageRating: 5, totalReviews: 0, socialNetworks: [],
    }]));
    await page.goto(url);
    await choose(page, "SELLER_RATING_ASC");
    await expect(page.getByText("Выдача SELLER_RATING_ASC", { exact: true })).toBeVisible();
    expect(bodies.at(-1)).toEqual({ ...filters, pageable: { size, sortBy: "SELLER_RATING_ASC" } });
  });
}

test("guest category hydrates only its SSR key, then requests a new sort and price from page one", async ({ page }) => {
  const bodies = await mockCatalog(page);
  const response = await page.goto("/catalog/category/930-sort");
  expect(await response!.text()).toContain("Серверный товар F09");
  const serverItem = page.getByText("Серверный товар F09", { exact: true });
  await expect(serverItem).toBeVisible();
  await choose(page, "PRICE_DESC");
  await expect(page.getByText("Выдача PRICE_DESC", { exact: true })).toBeVisible();
  await expect(serverItem).toHaveCount(0);
  const pageable = { size: 20, sortBy: "PRICE_DESC" };
  expect(bodies).toEqual([{ categoryId: 930, pageable }]);

  await page.getByTestId("price-range-trigger").click();
  const dialog = page.getByRole("dialog", { name: "Цена", exact: true });
  await dialog.getByRole("textbox", { name: "От", exact: true }).fill("10");
  await dialog.getByRole("button", { name: "Готово", exact: true }).click();
  await expect.poll(() => bodies.at(-1)).toEqual({ categoryId: 930, priceRange: { minPrice: 10 }, pageable });
  await choose(page, "DATE_DESC");
  await expect(page.getByText("Выдача DATE_DESC", { exact: true })).toBeVisible();
  await expect(serverItem).toHaveCount(0);
  expect(bodies.at(-1)).toEqual({ categoryId: 930, priceRange: { minPrice: 10 }, pageable: { size: 20, sortBy: "DATE_DESC" } });
});

test("guest home hydrates its SSR first page and fetches fresh data on each sort change", async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_HOME_CATALOG_FIXTURE !== "1", "Requires the opt-in home SSR fixture");
  const bodies = await mockCatalog(page);
  const response = await page.goto("/");
  expect(await response!.text()).toContain("Серверный товар главной F09");
  const serverItem = page.getByText("Серверный товар главной F09", { exact: true });
  await expect(serverItem).toBeVisible();

  for (const sortBy of ["DATE_ASC", "DATE_DESC"] as const) {
    await choose(page, sortBy);
    await expect(page.getByText(`Выдача ${sortBy}`, { exact: true })).toBeVisible();
    await expect(serverItem).toHaveCount(0);
  }
  expect(bodies).toEqual([
    { pageable: { size: 18, sortBy: "DATE_ASC" } },
    { pageable: { size: 18, sortBy: "DATE_DESC" } },
  ]);
});

async function applyPrice(page: Page, minPrice: number) {
  await page.getByTestId("price-range-trigger").click();
  const dialog = page.getByRole("dialog", { name: "Цена", exact: true });
  await dialog.getByRole("textbox", { name: "От", exact: true }).fill(String(minPrice));
  await dialog.getByRole("button", { name: "Готово", exact: true }).click();
}

async function search(page: Page, name: string) {
  const input = page.getByRole("combobox", { name: "поиск по сайту" }).filter({ visible: true });
  await input.fill(name);
  await input.press("Enter");
  await expect(page).toHaveURL(new RegExp(`[?&]query=${name}(?:&|$)`));
}

for (const criterion of ["sort", "price", "search"] as const) {
  test(`revisiting ${criterion} starts at page one and paginates from the new response`, async ({ page }) => {
    await mockGuestAuth(page);
    const priceRange = criterion === "price" ? { minPrice: 100 } : undefined;
    const firstRequest: ProductRequestModel = {
      name: "figure",
      ...(priceRange && { priceRange }),
      pageable: { size: 10, sortBy: "PRICE_ASC" },
    };
    const requests: ProductRequestModel[] = [];
    let starts = 0;
    let release!: () => void;
    const freshPage = new Promise<void>(resolve => { release = resolve; });
    const row = (id: number, name: string): ProductDto => ({
      ...product, id, name, price: id + 0.125, currency: "RUB",
      status: "ACTIVE", availability: "PURCHASABLE",
    });
    const old = Array.from({ length: 10 }, (_, index) => row(1000 + index, `Старая страница ${index}`));
    const fresh = Array.from({ length: 10 }, (_, index) => row(2000 + index, `Новая страница ${index}`));
    await page.route("**/products/find", async route => {
      if (route.request().method() === "OPTIONS") return fulfillJson(route, []);
      const body: ProductRequestModel = route.request().postDataJSON();
      requests.push(body);
      if (body.name !== firstRequest.name || body.pageable.sortBy !== "PRICE_ASC" ||
          body.priceRange?.minPrice !== priceRange?.minPrice) {
        return fulfillJson(route, [row(3000, "Другая выдача")]);
      }
      if (body.pageable.lastId !== undefined) {
        return fulfillJson(route, [row(starts === 1 ? 1010 : 2010, starts === 1 ? "Старый хвост" : "Новый хвост")]);
      }
      starts++;
      if (starts > 1) await freshPage;
      return fulfillJson(route, starts === 1 ? old : fresh);
    });

    await page.goto("/catalog/search?query=figure");
    await expect(page.getByText("Другая выдача", { exact: true })).toBeVisible();
    if (priceRange) await applyPrice(page, priceRange.minPrice);
    await choose(page, "PRICE_ASC");
    const sentinel = page.getByTestId("infinite-scroll-sentinel");
    const showSentinel = () => sentinel.evaluate(element => element.scrollIntoView({ block: "end" }));
    const oldTail = page.getByText("Старый хвост", { exact: true });
    const oldLast = old.at(-1)!;
    try {
      await expect(page.getByText(old[0].name, { exact: true })).toBeVisible();
      await showSentinel();
      await expect(oldTail).toBeVisible();
      expect(requests.slice(-2)).toEqual([firstRequest, {
        ...firstRequest, pageable: { ...firstRequest.pageable, lastId: oldLast.id, lastPrice: oldLast.price },
      }]);

      if (criterion === "sort") await choose(page, "DATE_ASC");
      if (criterion === "price") await applyPrice(page, 200);
      if (criterion === "search") await search(page, "other");
      await expect(page.getByText("Другая выдача", { exact: true })).toBeVisible();
      if (criterion === "sort") await choose(page, "PRICE_ASC");
      if (criterion === "price") await applyPrice(page, 100);
      if (criterion === "search") await search(page, "figure");
      await expect.poll(() => starts).toBe(2);
      expect(requests.at(-1)).toEqual(firstRequest);
      await expect(oldTail).toHaveCount(0);
      await expect(page.getByText(old[0].name, { exact: true })).toHaveCount(0);
      release();
      await expect(page.getByText(fresh[0].name, { exact: true })).toBeVisible();
      await showSentinel();
      await expect(page.getByText("Новый хвост", { exact: true })).toBeVisible();
      const freshLast = fresh.at(-1)!;
      expect(requests.slice(-2)).toEqual([firstRequest, {
        ...firstRequest, pageable: { ...firstRequest.pageable, lastId: freshLast.id, lastPrice: freshLast.price },
      }]);

      // Applying the same filter can re-render the catalog without changing query criteria.
      const count = requests.length;
      if (priceRange) {
        await applyPrice(page, priceRange.minPrice);
        await expect(page.getByRole("dialog", { name: "Цена", exact: true })).toHaveCount(0);
      } else {
        await select(page).click();
        await page.keyboard.press("Escape");
      }
      await expect(page.getByText("Новый хвост", { exact: true })).toBeVisible();
      expect(requests).toHaveLength(count);
    } finally { release(); }
  });
}

for (const phase of ["products", "images"] as const) {
  test(`switching sort cancels the previous ${phase} read`, async ({ page }) => {
    const bodies = await mockCatalog(page);
    const pendingPath = phase === "products" ? "/products/find" : "/images/metadata";
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    let started!: () => void;
    const pending = new Promise<void>(resolve => { started = resolve; });
    const dateRequests: ProductRequestModel[] = [];
    await page.route("**/products/find", async route => {
      if (route.request().method() === "OPTIONS") return fulfillJson(route, []);
      if (route.request().postDataJSON().pageable.sortBy !== "DATE_ASC") return route.fallback();
      dateRequests.push(route.request().postDataJSON());
      if (dateRequests.length > 1) {
        return fulfillJson(route, [{ ...product, name: "Свежая выдача DATE_ASC", imageId: 0 }]);
      }
      if (phase === "products") { started(); await gate; }
      return fulfillJson(route, [{ ...product, name: "Устаревшая выдача", imageId: phase === "images" ? 1234 : 0 }]);
    });
    await page.route("**/images/metadata?ids=1234", async route => {
      started();
      await gate;
      return fulfillJson(route, []);
    });
    await page.goto("/catalog/search?query=figure");
    await expect(page.getByText("Выдача DATE_DESC", { exact: true })).toBeVisible();
    await choose(page, "DATE_ASC");
    try {
      await pending;
      const aborted = page.waitForEvent("requestfailed", request => new URL(request.url()).pathname === pendingPath &&
        request.failure()?.errorText === "net::ERR_ABORTED");
      await choose(page, "PRICE_ASC");
      await expect(page.getByText("Выдача PRICE_ASC", { exact: true })).toBeVisible();
      await aborted;
      await choose(page, "DATE_ASC");
      await expect(page.getByText("Свежая выдача DATE_ASC", { exact: true })).toBeVisible();
      release();
      await expect(page.getByText("Устаревшая выдача", { exact: true })).toHaveCount(0);
      expect(bodies.map(body => body.pageable.sortBy)).toEqual(["DATE_DESC", "PRICE_ASC"]);
      const dateRequest = { name: "figure", pageable: { size: 10, sortBy: "DATE_ASC" } };
      expect(dateRequests).toEqual([dateRequest, dateRequest]);
    } finally { release(); }
  });
}
