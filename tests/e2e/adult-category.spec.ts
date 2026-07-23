import { expect, type BrowserContext, type Page, test } from "@playwright/test";

const ADULT_CATEGORY_PATH = "/catalog/category/131-18%2B";
const AGE_VERIFICATION_STORAGE_KEY = "figurzilla:age-verification:18-plus:v2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const authenticate = async (
  context: BrowserContext,
  baseURL: string | undefined,
) => {
  if (!baseURL) {
    throw new Error("Playwright baseURL is required for auth cookie setup");
  }

  await context.addCookies([
    {
      name: "access_token",
      value: "test-access-token",
      url: baseURL,
    },
  ]);
};

const storeAgeVerification = async (page: Page) => {
  await page.addInitScript((storageKey) => {
    window.sessionStorage.setItem(storageKey, "true");
  }, AGE_VERIFICATION_STORAGE_KEY);
};

const gotoAdultCategory = (page: Page) =>
  page.goto(ADULT_CATEGORY_PATH, { waitUntil: "domcontentloaded" });

const mockAdultProducts = async (
  page: Page,
  status: 200 | 403,
): Promise<unknown[]> => {
  const productRequests: unknown[] = [];

  await page.route("**/products/find", async (route) => {
    const request = route.request();

    if (request.method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: corsHeaders,
      });
      return;
    }

    productRequests.push(request.postDataJSON());

    if (status === 403) {
      await route.fulfill({
        status: 403,
        headers: corsHeaders,
        contentType: "application/json",
        body: JSON.stringify({
          code: "FORBIDDEN",
          message: "Forbidden",
          status: 403,
          timestamp: new Date().toISOString(),
          details: null,
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      headers: corsHeaders,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: 9001,
          name: "Adult category test product",
          count: 1,
          price: 1500,
          prepaymentAmount: 0,
          currency: "RUB",
          categories: [{ id: 131, name: "18+", childs: [] }],
          imageId: 0,
          sellerId: 1,
          expirationDate: "2030-01-01T00:00:00.000Z",
          status: "ACTIVE",
          availability: "PURCHASABLE",
          externalUrl: "",
          sellerLogin: "testseller",
          sellerRating: 5,
          totalReviews: 1,
          createdAt: "2030-01-01T00:00:00.000Z",
        },
      ]),
    });
  });

  return productRequests;
};

const includesAdultFlag = (requestBody: unknown): boolean =>
  typeof requestBody === "object" &&
  requestBody !== null &&
  "includeAdult" in requestBody &&
  requestBody.includeAdult === true;

test.describe("adult category access", () => {
  test("shows unauthorized state for anonymous user", async ({ page }) => {
    await gotoAdultCategory(page);

    await expect(page.getByTestId("unauthorized-state-adult")).toBeVisible();
    await expect(page.getByTestId("age-verification-gate")).toBeHidden();
  });

  test("shows age verification gate for authenticated adult user", async ({
    context,
    page,
    baseURL,
  }) => {
    await authenticate(context, baseURL);

    await gotoAdultCategory(page);

    await expect(page.getByTestId("age-verification-gate")).toBeVisible();
  });

  test("loads adult products after explicit age confirmation", async ({
    context,
    page,
    baseURL,
  }) => {
    await authenticate(context, baseURL);
    const productRequests = await mockAdultProducts(page, 200);

    await gotoAdultCategory(page);
    await page.getByTestId("age-verification-confirm").click();

    await expect(page.getByText("Adult category test product")).toBeVisible();
    expect(productRequests.some(includesAdultFlag)).toBe(true);
  });

  test("shows forbidden state when backend rejects adult access", async ({
    context,
    page,
    baseURL,
  }) => {
    await authenticate(context, baseURL);
    await storeAgeVerification(page);
    const productRequests = await mockAdultProducts(page, 403);

    await gotoAdultCategory(page);

    await expect.poll(() => productRequests.length).toBeGreaterThan(0);
    await expect(page.getByTestId("error-state-products")).toBeVisible({
      timeout: 15_000,
    });
    expect(productRequests.some(includesAdultFlag)).toBe(true);
  });
});
