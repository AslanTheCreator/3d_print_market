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

interface AddressInputFixture {
  country: string;
  city: string;
  street: string;
  houseNumber: string;
  apartmentNumber: string;
  index: number;
}

interface AddressFixture extends AddressInputFixture {
  id: number;
  status: "ACTIVE" | "DELETED";
  fullAddress: string;
}

interface AddressApiController {
  updatePaths: string[];
  updateRequests: AddressInputFixture[];
}

const initialAddress: AddressFixture = {
  id: 42,
  country: "Россия",
  city: "Москва",
  street: "Тверская",
  houseNumber: "12",
  apartmentNumber: "34",
  index: 125009,
  status: "ACTIVE",
  fullAddress: "Россия, Москва, Тверская 12, кв. 34",
};

const successfulUpdate: AddressInputFixture = {
  country: "Россия",
  city: "Санкт-Петербург",
  street: "Невский проспект",
  houseNumber: "25А",
  apartmentNumber: "17",
  index: 191025,
};

const retryUpdate: AddressInputFixture = {
  country: "Россия",
  city: "Казань",
  street: "улица Баумана",
  houseNumber: "7",
  apartmentNumber: "12",
  index: 420111,
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
      value: "address-management-test-access-token",
      url: baseURL,
    },
  ]);
};

const fulfillJson = async (
  route: Route,
  body: unknown,
  status: number = 200,
) => {
  if (route.request().method() === "OPTIONS") {
    await route.fulfill({ status: 204, headers: corsHeaders });
    return;
  }

  await route.fulfill({
    status,
    headers: corsHeaders,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
};

const createAddressResponse = (
  id: number,
  input: AddressInputFixture,
): AddressFixture => ({
  id,
  ...input,
  status: "ACTIVE",
  fullAddress: [
    input.country,
    input.city,
    `${input.street} ${input.houseNumber}`,
    input.apartmentNumber ? `кв. ${input.apartmentNumber}` : "",
  ]
    .filter(Boolean)
    .join(", "),
});

const mockDashboardApi = async (page: Page) => {
  await page.route("**/auth/profile", (route) =>
    fulfillJson(route, {
      id: 1,
      fullName: "Тестовый пользователь",
      login: "address-test-user",
      role: "USER",
      email: "user@example.com",
      imageId: null,
      image: [],
      exp: 0,
      type: "access",
    }),
  );
  await page.route("**/basket/find", (route) => fulfillJson(route, []));
  await page.route("**/favorites/find", (route) => fulfillJson(route, []));
  await page.route("**/products/my", (route) => fulfillJson(route, []));
  await page.route("**/order/customer", (route) => fulfillJson(route, []));
  await page.route("**/order/seller", (route) => fulfillJson(route, []));
  await page.route("**/images/metadata?ids=*", (route) =>
    fulfillJson(route, []),
  );
};

const mockAddressApi = async (
  page: Page,
  { failFirstUpdate = false }: { failFirstUpdate?: boolean } = {},
): Promise<AddressApiController> => {
  let currentAddress = initialAddress;
  let shouldFailUpdate = failFirstUpdate;
  const updatePaths: string[] = [];
  const updateRequests: AddressInputFixture[] = [];

  await page.route("**/address/*", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await fulfillJson(route, null);
      return;
    }

    const url = new URL(route.request().url());
    const addressPath = url.pathname.match(/\/address\/\d+$/)?.[0] ?? url.pathname;

    if (route.request().method() !== "PUT") {
      await fulfillJson(
        route,
        {
          code: "METHOD_NOT_ALLOWED",
          message: "Метод не поддерживается",
          status: 405,
        },
        405,
      );
      return;
    }

    const payload = route.request().postDataJSON() as AddressInputFixture;
    updatePaths.push(addressPath);
    updateRequests.push(payload);

    if (shouldFailUpdate) {
      shouldFailUpdate = false;
      await fulfillJson(
        route,
        {
          code: "ADDRESS_UPDATE_FAILED",
          message: "Не удалось обновить адрес",
          status: 500,
        },
        500,
      );
      return;
    }

    currentAddress = createAddressResponse(initialAddress.id, payload);
    await fulfillJson(route, currentAddress);
  });

  await page.route("**/address", (route) =>
    fulfillJson(route, [currentAddress]),
  );

  return { updatePaths, updateRequests };
};

const getEditForm = (page: Page) =>
  page
    .getByRole("button", { name: "Сохранить изменения", exact: true })
    .locator("xpath=ancestor::form");

const expectAddressFormValues = async (
  page: Page,
  expected: AddressInputFixture,
) => {
  const form = getEditForm(page);

  await expect(form.getByLabel("Страна", { exact: true })).toHaveValue(
    expected.country,
  );
  await expect(form.getByLabel("Город", { exact: true })).toHaveValue(
    expected.city,
  );
  await expect(form.getByLabel("Улица", { exact: true })).toHaveValue(
    expected.street,
  );
  await expect(form.getByLabel("Номер дома", { exact: true })).toHaveValue(
    expected.houseNumber,
  );
  await expect(
    form.getByLabel("Номер квартиры", { exact: true }),
  ).toHaveValue(expected.apartmentNumber);
  await expect(
    form.getByLabel("Почтовый индекс", { exact: true }),
  ).toHaveValue(String(expected.index));
};

const fillAddressForm = async (page: Page, input: AddressInputFixture) => {
  const form = getEditForm(page);

  await form.getByLabel("Страна", { exact: true }).fill(input.country);
  await form.getByLabel("Город", { exact: true }).fill(input.city);
  await form.getByLabel("Улица", { exact: true }).fill(input.street);
  await form.getByLabel("Номер дома", { exact: true }).fill(input.houseNumber);
  await form
    .getByLabel("Номер квартиры", { exact: true })
    .fill(input.apartmentNumber);
  await form
    .getByLabel("Почтовый индекс", { exact: true })
    .fill(String(input.index));
};

const openAddressEditor = async (page: Page) => {
  const editButton = page.getByRole("button", {
    name: "Редактировать адрес: Тверская 12",
    exact: true,
  });

  await expect(editButton).toBeVisible({ timeout: 15_000 });
  await editButton.click();
  await expect(
    page.getByRole("heading", { name: "Редактировать адрес", exact: true }),
  ).toBeVisible();
  await expect(getEditForm(page)).toBeVisible();
};

test.describe("address management", () => {
  test("edits a prefilled address and sends the exact AddressInput payload", async ({
    context,
    page,
    baseURL,
  }) => {
    await authenticate(context, baseURL);
    await mockDashboardApi(page);
    const addressApi = await mockAddressApi(page);

    await page.goto("/dashboard/settings?tab=address", {
      waitUntil: "domcontentloaded",
    });

    await openAddressEditor(page);
    await expectAddressFormValues(page, initialAddress);
    await fillAddressForm(page, successfulUpdate);
    await getEditForm(page)
      .getByRole("button", { name: "Сохранить изменения", exact: true })
      .click();

    await expect.poll(() => addressApi.updateRequests.length).toBe(1);
    expect(addressApi.updatePaths).toEqual(["/address/42"]);
    expect(addressApi.updateRequests).toEqual([successfulUpdate]);
    await expect(page.getByText("Адрес успешно обновлён")).toBeVisible();
    await expect(
      page.getByText("Невский проспект 25А, кв. 17", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Санкт-Петербург, Россия", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Индекс: 191025", { exact: true })).toBeVisible();
  });

  test("keeps edited values after a failed update and retries successfully", async ({
    context,
    page,
    baseURL,
  }) => {
    await authenticate(context, baseURL);
    await mockDashboardApi(page);
    const addressApi = await mockAddressApi(page, { failFirstUpdate: true });

    await page.goto("/dashboard/settings?tab=address", {
      waitUntil: "domcontentloaded",
    });

    await openAddressEditor(page);
    await fillAddressForm(page, retryUpdate);

    const submitButton = getEditForm(page).getByRole("button", {
      name: "Сохранить изменения",
      exact: true,
    });
    await submitButton.click();

    await expect.poll(() => addressApi.updateRequests.length).toBe(1);
    await expect(page.getByText("Не удалось обновить адрес")).toBeVisible();
    await expect(getEditForm(page)).toBeVisible();
    await expectAddressFormValues(page, retryUpdate);
    await expect(submitButton).toBeEnabled();
    expect(addressApi.updatePaths).toEqual(["/address/42"]);
    expect(addressApi.updateRequests).toEqual([retryUpdate]);

    await submitButton.click();

    await expect.poll(() => addressApi.updateRequests.length).toBe(2);
    expect(addressApi.updatePaths).toEqual(["/address/42", "/address/42"]);
    expect(addressApi.updateRequests).toEqual([retryUpdate, retryUpdate]);
    await expect(page.getByText("Адрес успешно обновлён")).toBeVisible();
    await expect(
      page.getByText("улица Баумана 7, кв. 12", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Казань, Россия", { exact: true })).toBeVisible();
    await expect(page.getByText("Индекс: 420111", { exact: true })).toBeVisible();
  });
});
