import {
  expect,
  type BrowserContext,
  type Page,
  type Route,
  test,
} from "@playwright/test";
import type { Address, AddressInput } from "@/entities/address";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const newAddressInput: AddressInput = {
  country: "Россия",
  city: "Санкт-Петербург",
  street: "Невский проспект",
  houseNumber: "25А",
  apartmentNumber: "17",
  index: 191025,
};

const createAddress = (id: number, input: AddressInput): Address => ({
  ...input,
  id,
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

const existingAddress = createAddress(50, {
  country: "Россия",
  city: "Москва",
  street: "Тестовая",
  houseNumber: "1",
  apartmentNumber: "",
  index: 101000,
});
const createdAddress = createAddress(7, newAddressInput);

interface OrderInputFixture {
  productId: number;
  count: number;
  addressId: number;
  transferId: number;
  comment: string;
}

interface CheckoutAddressApiController {
  addresses: Address[];
  addressesAfterCreate: Address[];
  postRequests: AddressInput[];
  getRequests: number;
  postMode: "success" | "failure";
  getMode: "success" | "failure";
  postGate: Promise<void> | null;
  getGate: Promise<void> | null;
  orderRequests: OrderInputFixture[][];
}

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
      value: "checkout-address-test-access-token",
      url: baseURL,
    },
  ]);
};

const fulfillJson = async (
  route: Route,
  body: unknown,
  status = 200,
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

const setupCheckoutApi = async (
  page: Page,
  initialAddresses: Address[] = [existingAddress],
): Promise<CheckoutAddressApiController> => {
  const controller: CheckoutAddressApiController = {
    addresses: initialAddresses,
    addressesAfterCreate: [createdAddress, ...initialAddresses],
    postRequests: [],
    getRequests: 0,
    postMode: "success",
    getMode: "success",
    postGate: null,
    getGate: null,
    orderRequests: [],
  };
  const createCartItem = (id: number) => ({
    product: {
      id,
      name: `Товар ${id}`,
      count: 5,
      price: 1000,
      prepaymentAmount: 0,
      currency: "RUB",
      categories: [{ id: 1, name: "Фигурки", childs: [] }],
      imageId: 0,
      sellerId: 10,
      expirationDate: "2030-01-01T00:00:00.000Z",
      status: "ACTIVE",
      availability: "PURCHASABLE",
      externalUrl: "",
      sellerLogin: "address-seller",
      sellerRating: 5,
      totalReviews: 1,
      createdAt: "2030-01-01T00:00:00.000Z",
    },
    count: 2,
    availableCount: 5,
    enoughStock: true,
  });

  await page.route("**/basket/find", (route) =>
    fulfillJson(route, [createCartItem(1), createCartItem(2)]),
  );
  await page.route("**/auth/profile", (route) =>
    fulfillJson(route, {
      id: 999,
      fullName: "Тестовый покупатель",
      login: "address-buyer",
      role: "USER",
      email: "buyer@example.com",
      imageId: null,
      image: [],
      exp: 0,
      type: "access",
    }),
  );
  await page.route("**/address", async (route) => {
    const method = route.request().method();
    if (method === "OPTIONS") {
      await fulfillJson(route, null);
      return;
    }

    if (method === "POST") {
      controller.postRequests.push(
        route.request().postDataJSON() as AddressInput,
      );
      await controller.postGate;

      if (controller.postMode === "failure") {
        await fulfillJson(
          route,
          {
            code: "ADDRESS_CREATE_FAILED",
            message: "Invalid address",
            status: 400,
          },
          400,
        );
        return;
      }

      controller.addresses = controller.addressesAfterCreate;
      await route.fulfill({ status: 200, headers: corsHeaders, body: "" });
      return;
    }

    if (method === "GET") {
      controller.getRequests += 1;
      await controller.getGate;

      if (controller.getMode === "failure") {
        await fulfillJson(
          route,
          {
            code: "ADDRESS_LOAD_FAILED",
            message: "Address list unavailable",
            status: 500,
          },
          500,
        );
        return;
      }

      await fulfillJson(route, controller.addresses);
      return;
    }

    await fulfillJson(route, { message: "Unexpected address method" }, 405);
  });
  await page.route("**/dictionary?type=*", (route) =>
    fulfillJson(route, [
      {
        type: "SHOPPING_METHODS",
        value: "RUSSIAN_POST",
        description: "Почта России",
      },
      {
        type: "SHOPPING_METHODS",
        value: "TRANSPORT_COMPANY",
        description: "Транспортная компания",
      },
    ]),
  );
  await page.route("**/order?productId=*", (route) =>
    fulfillJson(route, {
      addresses: [],
      sellerTransfers: [
        {
          id: 101,
          sending: "RUSSIAN_POST",
          price: 300,
          currency: "RUB",
          participantId: 10,
          status: "ACTIVE",
        },
        {
          id: 102,
          sending: "TRANSPORT_COMPANY",
          price: 500,
          currency: "RUB",
          participantId: 10,
          status: "ACTIVE",
        },
      ],
    }),
  );
  await page.route("**/order/BOOKED", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await fulfillJson(route, null);
      return;
    }

    controller.orderRequests.push(
      route.request().postDataJSON() as OrderInputFixture[],
    );
    await fulfillJson(route, [101]);
  });

  return controller;
};

const getAddressForm = (page: Page) =>
  page.locator("form").filter({
    has: page.getByRole("heading", { name: "Новый адрес доставки", exact: true }),
  });

const getAddressCard = (page: Page, streetLine: string) =>
  page
    .getByText(streetLine, { exact: true })
    .locator("xpath=ancestor::*[contains(@class, 'MuiCard-root')]");

const getSubmitButton = (page: Page) =>
  page.getByRole("button", { name: "Оформить заказ", exact: true });

const openCheckout = async (page: Page, selectExistingAddress = true) => {
  await page.goto("/checkout", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Оформление заказа", exact: true }),
  ).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("checkout-delivery-10-102").click();
  await page
    .getByRole("checkbox", { name: "Выбрать товар Товар 2", exact: true })
    .uncheck();

  if (selectExistingAddress) {
    await page.getByText("Тестовая 1", { exact: true }).click();
    await expect(getSubmitButton(page)).toBeEnabled();
  }
};

const openAddressForm = async (page: Page, emptyAddresses = false) => {
  await page
    .getByRole("button", {
      name: emptyAddresses ? "Добавить адрес" : "Добавить новый адрес",
      exact: true,
    })
    .click();
  await expect(getAddressForm(page)).toBeVisible();
  await expect(getSubmitButton(page)).toBeDisabled();
};

const fillAddressForm = async (page: Page, input = newAddressInput) => {
  const form = getAddressForm(page);
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

const expectAddressValues = async (page: Page, input = newAddressInput) => {
  const form = getAddressForm(page);
  await expect(form.getByLabel("Страна", { exact: true })).toHaveValue(
    input.country,
  );
  await expect(form.getByLabel("Город", { exact: true })).toHaveValue(input.city);
  await expect(form.getByLabel("Улица", { exact: true })).toHaveValue(input.street);
  await expect(form.getByLabel("Номер дома", { exact: true })).toHaveValue(
    input.houseNumber,
  );
  await expect(form.getByLabel("Номер квартиры", { exact: true })).toHaveValue(
    input.apartmentNumber,
  );
  await expect(form.getByLabel("Почтовый индекс", { exact: true })).toHaveValue(
    String(input.index),
  );
};

const saveAddress = (page: Page) =>
  getAddressForm(page)
    .getByRole("button", { name: "Сохранить и использовать", exact: true })
    .click();

const expectCreatedAddressSelected = async (page: Page) => {
  await expect(getAddressForm(page)).toHaveCount(0);
  await expect(
    getAddressCard(page, "Невский проспект 25А, кв. 17").getByTestId(
      "RadioButtonCheckedIcon",
    ),
  ).toBeVisible();
  await expect(getSubmitButton(page)).toBeEnabled();
};

const expectOrderPayload = async (
  page: Page,
  controller: CheckoutAddressApiController,
  addressId = createdAddress.id,
  comment = "",
) => {
  await getSubmitButton(page).click();
  await expect.poll(() => controller.orderRequests).toEqual([
    [{ productId: 1, count: 2, addressId, transferId: 102, comment }],
  ]);
};

test.describe("checkout address creation", () => {
  test("creates the first address and blocks checkout through POST and the confirming GET", async ({
    context,
    page,
    baseURL,
  }) => {
    await authenticate(context, baseURL);
    const controller = await setupCheckoutApi(page, []);
    await openCheckout(page, false);
    await openAddressForm(page, true);
    await fillAddressForm(page);

    let releasePost: () => void = () => undefined;
    let releaseGet: () => void = () => undefined;
    controller.postGate = new Promise<void>((resolve) => {
      releasePost = resolve;
    });
    controller.getGate = new Promise<void>((resolve) => {
      releaseGet = resolve;
    });
    const initialGetRequests = controller.getRequests;

    try {
      await saveAddress(page);
      await expect.poll(() => controller.postRequests).toEqual([newAddressInput]);
      await expect(getSubmitButton(page)).toBeDisabled();
      await expect(
        getAddressForm(page).getByRole("button", { name: "Отмена", exact: true }),
      ).toBeDisabled();
      expect(controller.orderRequests).toEqual([]);

      releasePost();
      await expect
        .poll(() => controller.getRequests)
        .toBeGreaterThan(initialGetRequests);
      await expect(getSubmitButton(page)).toBeDisabled();
      expect(controller.postRequests).toHaveLength(1);
      releaseGet();

      await expectCreatedAddressSelected(page);
      await expect(page).toHaveURL(/\/checkout$/);
      await expectOrderPayload(page, controller);
    } finally {
      releasePost();
      releaseGet();
    }
  });

  test("cancels the inline form without losing address, delivery, cart selection or comment", async ({
    context,
    page,
    baseURL,
  }) => {
    await authenticate(context, baseURL);
    const controller = await setupCheckoutApi(page);
    await openCheckout(page);
    const comment = "Позвоните перед доставкой";
    await page
      .getByRole("textbox", { name: "Комментарий к заказу", exact: true })
      .fill(comment);
    await openAddressForm(page);
    await fillAddressForm(page);
    await getAddressForm(page)
      .getByRole("button", { name: "Отмена", exact: true })
      .click();

    await expect(getAddressForm(page)).toHaveCount(0);
    await expect(
      getAddressCard(page, "Тестовая 1").getByTestId("RadioButtonCheckedIcon"),
    ).toBeVisible();
    await expect(
      page.getByTestId("checkout-delivery-10-102").getByRole("radio"),
    ).toBeChecked();
    await expect(
      page.getByRole("checkbox", { name: "Выбрать товар Товар 2", exact: true }),
    ).not.toBeChecked();
    await expect(
      page.getByRole("textbox", { name: "Комментарий к заказу", exact: true }),
    ).toHaveValue(comment);
    await expect(getSubmitButton(page)).toBeEnabled();
    expect(controller.postRequests).toEqual([]);
    await expectOrderPayload(page, controller, existingAddress.id, comment);
  });

  test("selects the unique matching new address among existing and unrelated new addresses", async ({
    context,
    page,
    baseURL,
  }) => {
    await authenticate(context, baseURL);
    const controller = await setupCheckoutApi(page);
    controller.addressesAfterCreate = [
      createAddress(900, { ...newAddressInput, street: "Другая улица" }),
      createdAddress,
      existingAddress,
    ];
    await openCheckout(page);
    const comment = "Не звонить в домофон";
    await page
      .getByRole("textbox", { name: "Комментарий к заказу", exact: true })
      .fill(comment);
    await openAddressForm(page);
    await fillAddressForm(page);
    await saveAddress(page);

    await expectCreatedAddressSelected(page);
    expect(controller.postRequests).toEqual([newAddressInput]);
    await expectOrderPayload(page, controller, createdAddress.id, comment);
  });

  test("preserves input after a rejected POST and retries the same address", async ({
    context,
    page,
    baseURL,
  }) => {
    await authenticate(context, baseURL);
    const controller = await setupCheckoutApi(page);
    controller.postMode = "failure";
    await openCheckout(page);
    await openAddressForm(page);
    await fillAddressForm(page);
    await saveAddress(page);

    await expect(
      page.getByText(
        "Не удалось сохранить адрес. Проверьте данные и повторите попытку.",
        { exact: true },
      ),
    ).toBeVisible();
    await expectAddressValues(page);
    await expect(getSubmitButton(page)).toBeDisabled();
    expect(controller.postRequests).toEqual([newAddressInput]);
    expect(controller.orderRequests).toEqual([]);
    controller.postMode = "success";
    await saveAddress(page);

    await expectCreatedAddressSelected(page);
    expect(controller.postRequests).toEqual([newAddressInput, newAddressInput]);
    await expectOrderPayload(page, controller);
  });

  test("retries only GET after the address was saved but the refreshed list failed", async ({
    context,
    page,
    baseURL,
  }) => {
    await authenticate(context, baseURL);
    const controller = await setupCheckoutApi(page);
    await openCheckout(page);
    await openAddressForm(page);
    await fillAddressForm(page);
    controller.getMode = "failure";
    await saveAddress(page);

    await expect(
      page.getByText(
        "Адрес сохранён, но не удалось обновить список. Повторите загрузку.",
        { exact: true },
      ),
    ).toBeVisible({ timeout: 15_000 });
    await expect(getSubmitButton(page)).toBeDisabled();
    expect(controller.postRequests).toEqual([newAddressInput]);
    expect(controller.orderRequests).toEqual([]);
    const failedGetRequests = controller.getRequests;
    controller.getMode = "success";
    await page
      .getByRole("button", { name: "Повторить загрузку", exact: true })
      .click();

    await expectCreatedAddressSelected(page);
    expect(controller.getRequests).toBeGreaterThan(failedGetRequests);
    expect(controller.postRequests).toEqual([newAddressInput]);
    await expectOrderPayload(page, controller);
  });

  test("requires a manual address choice when multiple new addresses match", async ({
    context,
    page,
    baseURL,
  }) => {
    await authenticate(context, baseURL);
    const controller = await setupCheckoutApi(page);
    controller.addressesAfterCreate = [
      existingAddress,
      createdAddress,
      createAddress(8, newAddressInput),
    ];
    await openCheckout(page);
    await openAddressForm(page);
    await fillAddressForm(page);
    await saveAddress(page);

    await expect(getAddressForm(page)).toHaveCount(0);
    const newAddressCards = getAddressCard(page, "Невский проспект 25А, кв. 17");
    await expect(newAddressCards).toHaveCount(2);
    await expect(newAddressCards.getByTestId("RadioButtonCheckedIcon")).toHaveCount(0);
    await expect(
      getAddressCard(page, "Тестовая 1").getByTestId("RadioButtonCheckedIcon"),
    ).toHaveCount(0);
    await expect(getSubmitButton(page)).toBeDisabled();
    expect(controller.orderRequests).toEqual([]);
    await newAddressCards.nth(1).click();
    await expect(getSubmitButton(page)).toBeEnabled();
    await expectOrderPayload(page, controller, 8);
    expect(controller.postRequests).toHaveLength(1);
  });

  test("returns from a failed confirmation to GET-only reload and manual address selection", async ({
    context,
    page,
    baseURL,
  }) => {
    await authenticate(context, baseURL);
    const controller = await setupCheckoutApi(page);
    await openCheckout(page);
    await openAddressForm(page);
    await fillAddressForm(page);
    controller.getMode = "failure";
    await saveAddress(page);

    await expect(
      page.getByText(
        "Адрес сохранён, но не удалось обновить список. Повторите загрузку.",
        { exact: true },
      ),
    ).toBeVisible({ timeout: 15_000 });
    await page
      .getByRole("button", { name: "Вернуться к адресам", exact: true })
      .click();

    await expect(getSubmitButton(page)).toBeDisabled();
    await expect(
      page.getByText(
        "Не удалось загрузить адреса доставки. Попробуйте ещё раз.",
        { exact: true },
      ),
    ).toBeVisible();
    expect(controller.postRequests).toEqual([newAddressInput]);
    expect(controller.orderRequests).toEqual([]);
    const failedGetRequests = controller.getRequests;
    controller.getMode = "success";
    await page.getByRole("button", { name: "Повторить", exact: true }).click();

    await expect(
      page.getByText("Невский проспект 25А, кв. 17", { exact: true }),
    ).toBeVisible();
    await expect(
      getAddressCard(page, "Тестовая 1").getByTestId("RadioButtonCheckedIcon"),
    ).toHaveCount(0);
    await expect(
      getAddressCard(page, "Невский проспект 25А, кв. 17").getByTestId(
        "RadioButtonCheckedIcon",
      ),
    ).toHaveCount(0);
    await expect(getSubmitButton(page)).toBeDisabled();
    expect(controller.getRequests).toBeGreaterThan(failedGetRequests);
    expect(controller.postRequests).toEqual([newAddressInput]);

    await page
      .getByText("Невский проспект 25А, кв. 17", { exact: true })
      .click();
    await expectOrderPayload(page, controller);
    expect(controller.postRequests).toHaveLength(1);
  });

  test("adds an address at a narrow mobile viewport without horizontal overflow", async ({
    context,
    page,
    baseURL,
  }) => {
    await page.setViewportSize({ width: 393, height: 727 });
    await authenticate(context, baseURL);
    const controller = await setupCheckoutApi(page, []);
    await openCheckout(page, false);
    await openAddressForm(page, true);
    await fillAddressForm(page);

    const horizontalOverflow = await page.evaluate(() => {
      const root = document.documentElement;
      return Math.max(root.scrollWidth, document.body.scrollWidth) - root.clientWidth;
    });
    expect(horizontalOverflow).toBeLessThanOrEqual(1);
    await expect(getSubmitButton(page)).toBeDisabled();
    await saveAddress(page);

    await expectCreatedAddressSelected(page);
    await expect(page).toHaveURL(/\/checkout$/);
    expect(controller.postRequests).toEqual([newAddressInput]);
    await expectOrderPayload(page, controller);
  });
});
