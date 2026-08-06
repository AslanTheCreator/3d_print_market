import {
  expect,
  type BrowserContext,
  type Page,
  type Route,
  test,
} from "@playwright/test";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const profileImage =
  "data:image/svg+xml;base64," +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="#ef4284"/></svg>',
  ).toString("base64");

const user = {
  id: 1,
  login: "a11y-user",
  mail: "a11y@example.com",
  fullName: "Тест доступности",
  phoneNumber: "+79990000000",
  status: "ACTIVE",
  sellerStatus: "DEFAULT",
  averageRating: 5,
  totalReviews: 2,
  imageId: 77,
  image: [],
  addresses: [],
  accounts: [],
  transfers: [],
  socialNetworks: [],
};

const fulfillJson = async (route: Route, body: unknown) => {
  if (route.request().method() === "OPTIONS") {
    await route.fulfill({ status: 204, headers: corsHeaders });
    return;
  }

  await route.fulfill({
    status: 200,
    headers: corsHeaders,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
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
      value: "accessibility-controls-test-token",
      url: baseURL,
    },
  ]);
};

const mockAuthenticatedShell = async (page: Page) => {
  await page.route("**/auth/profile", (route) =>
    fulfillJson(route, {
      id: user.id,
      fullName: user.fullName,
      login: user.login,
      role: "USER",
      email: user.mail,
      imageId: user.imageId,
      image: [],
      exp: 0,
      type: "access",
    }),
  );
  await page.route("**/participant", (route) => fulfillJson(route, user));
  await page.route("**/images/metadata?ids=*", (route) =>
    fulfillJson(route, [
      {
        id: 77,
        originalUrl: profileImage,
        mediumUrl: profileImage,
        thumbnailUrl: profileImage,
        width: 120,
        height: 120,
        contentType: "image/svg+xml",
      },
    ]),
  );
  await page.route("**/basket/find", (route) => fulfillJson(route, []));
  await page.route("**/favorites/find", (route) => fulfillJson(route, []));
  await page.route("**/products/my", (route) => fulfillJson(route, []));
  await page.route("**/order/customer", (route) => fulfillJson(route, []));
  await page.route("**/order/seller", (route) => fulfillJson(route, []));
};

test("avatar upload and delete are separate single-action keyboard controls", async ({
  context,
  page,
  baseURL,
}) => {
  await authenticate(context, baseURL);
  await mockAuthenticatedShell(page);

  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await page
    .getByRole("button", { name: "Редактировать профиль" })
    .first()
    .click();

  const upload = page.getByRole("button", {
    name: "Выбрать новую фотографию профиля",
  });
  const remove = page.getByRole("button", {
    name: "Удалить фотографию профиля",
  });
  let fileChooserCount = 0;
  page.on("filechooser", () => {
    fileChooserCount += 1;
  });

  await expect(upload).toBeVisible();
  await expect(remove).toBeVisible();
  await expect(page.locator("button button")).toHaveCount(0);

  const fileChooserPromise = page.waitForEvent("filechooser");
  await upload.focus();
  await page.keyboard.press("Enter");
  await fileChooserPromise;
  expect(fileChooserCount).toBe(1);

  await remove.focus();
  await page.keyboard.press("Space");
  await expect(remove).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Выбрать фотографию профиля" }),
  ).toBeVisible();
  expect(fileChooserCount).toBe(1);
});

test("collapsible settings card keeps its switch separate from expansion", async ({
  context,
  page,
  baseURL,
}) => {
  await authenticate(context, baseURL);
  await mockAuthenticatedShell(page);
  await page.route("**/dictionary?type=*", (route) => {
    const type = new URL(route.request().url()).searchParams.get("type");

    return fulfillJson(
      route,
      type === "SHOPPING_METHODS"
        ? [
            {
              value: "TRANSPORT_COMPANY",
              description: "Транспортная компания",
            },
          ]
        : [{ value: "RUB", description: "Российский рубль" }],
    );
  });
  await page.route("**/transfer", (route) => fulfillJson(route, []));

  await page.goto("/dashboard/settings?tab=shipping", {
    waitUntil: "domcontentloaded",
  });

  const enabledSwitch = page.getByRole("checkbox", {
    name: /раздел «Транспортная компания»$/,
  });
  await expect(enabledSwitch).toBeVisible({ timeout: 15_000 });
  await enabledSwitch.focus();
  await page.keyboard.press("Space");

  const collapse = page.getByRole("button", {
    name: "Свернуть раздел «Транспортная компания»",
  });
  await expect(enabledSwitch).toBeChecked();
  await expect(collapse).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("button button")).toHaveCount(0);

  await collapse.focus();
  await page.keyboard.press("Enter");
  const expand = page.getByRole("button", {
    name: "Развернуть раздел «Транспортная компания»",
  });
  await expect(expand).toHaveAttribute("aria-expanded", "false");
  await expect(enabledSwitch).toBeChecked();

  await expand.focus();
  await page.keyboard.press("Space");
  await expect(collapse).toHaveAttribute("aria-expanded", "true");
  await expect(enabledSwitch).toBeChecked();
});
