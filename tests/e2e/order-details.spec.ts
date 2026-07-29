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
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const transparentPngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

type OrderStatus =
  | "BOOKED"
  | "AWAITING_PREPAYMENT"
  | "AWAITING_PREPAYMENT_APPROVAL"
  | "AWAITING_PAYMENT"
  | "ASSEMBLING"
  | "ON_THE_WAY"
  | "COMPLETED";

interface OrderHistoryFixture {
  status: OrderStatus;
  comment: string;
  changedAt: string;
}

interface OrderFixtureOptions {
  orderId: number;
  actualStatus: OrderStatus;
  peerId: number;
  peerLogin: string;
  peerPhone: string;
  peerMail: string;
  deliveryAddress: string;
  deliveryUrl?: string;
  imageIds?: number[];
  histories: OrderHistoryFixture[];
  availability?: "PURCHASABLE" | "PREORDER";
  quantity?: number;
  unitPrice?: number;
  prepaymentAmount?: number;
  totalPrice?: number;
  createdAt?: string;
}

interface ImageFixture {
  fileName: string;
  contentType: string;
  imageData: string;
}

interface DashboardApiOptions {
  customerOrders?: unknown[];
  sellerOrders?: unknown[];
  proofImages?: Readonly<Record<number, ImageFixture>>;
  requestedProofIds?: number[];
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
      value: "order-details-test-access-token",
      url: baseURL,
    },
  ]);
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

const fulfillServerError = async (route: Route) => {
  if (route.request().method() === "OPTIONS") {
    await route.fulfill({ status: 204, headers: corsHeaders });
    return;
  }

  await route.fulfill({
    status: 500,
    headers: corsHeaders,
    contentType: "application/json",
    body: JSON.stringify({
      code: "ORDER_ACTION_FAILED",
      message: "Order action failed",
    }),
  });
};

const createOrderFixture = ({
  orderId,
  actualStatus,
  peerId,
  peerLogin,
  peerPhone,
  peerMail,
  deliveryAddress,
  deliveryUrl = "",
  imageIds = [],
  histories,
  availability = "PURCHASABLE",
  quantity = 1,
  unitPrice = 12_500,
  prepaymentAmount = availability === "PREORDER" ? 2_500 : 0,
  totalPrice = availability === "PREORDER"
    ? (unitPrice - prepaymentAmount) * quantity
    : unitPrice * quantity,
  createdAt = "2026-07-10T10:00:00.000Z",
}: OrderFixtureOptions) => ({
  orderId,
  actualStatus,
  totalPrice,
  createdAt,
  userInfo: {
    id: peerId,
    imageId: 0,
    login: peerLogin,
    phoneNumber: peerPhone,
    mail: peerMail,
  },
  product: {
    id: orderId + 1_000,
    name: `Тестовый товар ${orderId}`,
    count: quantity,
    price: unitPrice,
    prepaymentAmount,
    currency: "RUB",
    categories: [{ id: 1, name: "Фигурки", childs: [] }],
    imageId: 0,
    sellerId: 10,
    expirationDate: "2030-01-01T00:00:00.000Z",
    status: "ACTIVE",
    availability,
    sellerLogin: "seller",
    sellerRating: 4.9,
    totalReviews: 25,
    createdAt: "2026-07-01T10:00:00.000Z",
  },
  transfer: {
    transferId: 51,
    addressId: 61,
    imageId: 0,
    address: deliveryAddress,
    price: 400,
    currency: "RUB",
  },
  images: imageIds,
  deliveryUrl,
  histories,
});

const mockDashboardApi = async (
  page: Page,
  {
    customerOrders = [],
    sellerOrders = [],
    proofImages = {},
    requestedProofIds = [],
  }: DashboardApiOptions,
) => {
  await page.route("**/auth/profile", (route) =>
    fulfillJson(route, {
      id: 1,
      fullName: "Тестовый пользователь",
      login: "order-details-user",
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
  await page.route("**/order/customer", (route) =>
    fulfillJson(route, customerOrders),
  );
  await page.route("**/order/seller", (route) =>
    fulfillJson(route, sellerOrders),
  );
  await page.route("**/images/metadata?ids=*", (route) =>
    fulfillJson(route, []),
  );
  await page.route("**/images?ids=*", (route) => {
    if (route.request().method() !== "OPTIONS") {
      const imageIds = new URL(route.request().url()).searchParams
        .getAll("ids")
        .map(Number)
        .filter((imageId) => Number.isInteger(imageId));

      requestedProofIds.push(...imageIds);

      return fulfillJson(
        route,
        imageIds.flatMap((imageId) => {
          const image = proofImages[imageId];
          return image ? [image] : [];
        }),
      );
    }

    return fulfillJson(route, []);
  });
};

test.describe("order details", () => {
  test("shows customer contacts, delivery, history and a safe tracking link", async ({
    context,
    page,
    baseURL,
  }) => {
    await authenticate(context, baseURL);

    const requestedProofIds: number[] = [];
    const customerOrder = createOrderFixture({
      orderId: 101,
      actualStatus: "ON_THE_WAY",
      peerId: 10,
      peerLogin: "seller-contact",
      peerPhone: "+7 900 111-22-33",
      peerMail: "seller-contact@example.com",
      deliveryAddress: "Россия, Москва, ул. Тестовая, 10",
      deliveryUrl: "https://tracking.example.com/orders/customer-101",
      imageIds: [701],
      histories: [
        {
          status: "BOOKED",
          comment: "Заказ создан",
          changedAt: "2026-07-10T10:00:00.000Z",
        },
        {
          status: "ASSEMBLING",
          comment: "Заказ собран",
          changedAt: "2026-07-11T10:00:00.000Z",
        },
        {
          status: "ON_THE_WAY",
          comment: "Передан в службу доставки",
          changedAt: "2026-07-12T10:00:00.000Z",
        },
      ],
    });

    await mockDashboardApi(page, {
      customerOrders: [customerOrder],
      requestedProofIds,
    });

    await page.goto("/dashboard/purchase", { waitUntil: "domcontentloaded" });

    const detailsButton = page
      .getByRole("button", { name: "Подробнее о заказе №101" })
      .first();
    await expect(detailsButton).toBeVisible({ timeout: 15_000 });
    await detailsButton.click();

    const dialog = page.getByRole("dialog", {
      name: "Детали заказа №101",
    });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Контакты", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Доставка", { exact: true })).toBeVisible();
    await expect(
      dialog.getByText("История заказа", { exact: true }),
    ).toBeVisible();
    await expect(dialog.getByTestId("order-contacts")).toContainText(
      "seller-contact@example.com",
    );
    await expect(dialog.getByTestId("order-delivery")).toContainText(
      "Россия, Москва, ул. Тестовая, 10",
    );
    await expect(dialog.getByTestId("order-history")).toContainText(
      "Передан в службу доставки",
    );

    const trackingLink = dialog.getByRole("link", {
      name: "Отследить отправление",
    });
    await expect(trackingLink).toHaveAttribute(
      "href",
      "https://tracking.example.com/orders/customer-101",
    );
    await expect(trackingLink).toHaveAttribute("target", "_blank");
    await expect(trackingLink).toHaveAttribute("rel", /noopener/);
    await expect(trackingLink).toHaveAttribute("rel", /noreferrer/);
    await expect(dialog.getByTestId("order-payment-proof")).toHaveCount(0);
    expect(requestedProofIds).toEqual([]);
  });

  test("shows seller payment proof and the empty proof state without tracking", async ({
    context,
    page,
    baseURL,
  }) => {
    await authenticate(context, baseURL);

    const requestedProofIds: number[] = [];
    const sellerOrderWithProof = createOrderFixture({
      orderId: 202,
      actualStatus: "AWAITING_PREPAYMENT_APPROVAL",
      peerId: 20,
      peerLogin: "buyer-with-proof",
      peerPhone: "+7 900 222-33-44",
      peerMail: "buyer-with-proof@example.com",
      deliveryAddress: "Россия, Казань, ул. Покупателя, 20",
      deliveryUrl: "https://tracking.example.com/orders/seller-202",
      imageIds: [802],
      availability: "PREORDER",
      histories: [
        {
          status: "BOOKED",
          comment: "Предзаказ создан",
          changedAt: "2026-07-09T10:00:00.000Z",
        },
        {
          status: "AWAITING_PREPAYMENT",
          comment: "Ожидается предоплата",
          changedAt: "2026-07-10T10:00:00.000Z",
        },
        {
          status: "AWAITING_PREPAYMENT_APPROVAL",
          comment: "Покупатель приложил подтверждение",
          changedAt: "2026-07-11T10:00:00.000Z",
        },
      ],
    });
    const sellerOrderWithoutProof = createOrderFixture({
      orderId: 203,
      actualStatus: "AWAITING_PREPAYMENT_APPROVAL",
      peerId: 21,
      peerLogin: "buyer-without-proof",
      peerPhone: "+7 900 333-44-55",
      peerMail: "buyer-without-proof@example.com",
      deliveryAddress: "Россия, Самара, ул. Покупателя, 30",
      imageIds: [],
      availability: "PREORDER",
      histories: [
        {
          status: "BOOKED",
          comment: "Предзаказ создан",
          changedAt: "2026-07-10T10:00:00.000Z",
        },
        {
          status: "AWAITING_PREPAYMENT_APPROVAL",
          comment: "Ожидается проверка",
          changedAt: "2026-07-12T10:00:00.000Z",
        },
      ],
    });

    await mockDashboardApi(page, {
      sellerOrders: [sellerOrderWithProof, sellerOrderWithoutProof],
      requestedProofIds,
      proofImages: {
        802: {
          fileName: "payment-proof-202.png",
          contentType: "image/png",
          imageData: transparentPngBase64,
        },
      },
    });

    await page.goto("/dashboard/sales", { waitUntil: "domcontentloaded" });

    const detailsWithProofButton = page
      .getByRole("button", { name: "Подробнее о заказе №202" })
      .first();
    await expect(detailsWithProofButton).toBeVisible({ timeout: 15_000 });
    await detailsWithProofButton.click();

    let dialog = page.getByRole("dialog", {
      name: "Детали заказа №202",
    });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Контакты", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Доставка", { exact: true })).toBeVisible();
    await expect(
      dialog.getByText("История заказа", { exact: true }),
    ).toBeVisible();
    await expect(dialog.getByTestId("order-payment-proof")).toBeVisible();

    const proofImage = dialog
      .getByRole("img", {
        name: "Подтверждение оплаты по заказу #202 1",
        exact: true,
      })
      .first();
    await expect(proofImage).toBeVisible();
    await expect(proofImage).toHaveAttribute(
      "src",
      `data:image/png;base64,${transparentPngBase64}`,
    );
    await expect(dialog.getByTestId("order-tracking")).toHaveCount(0);
    await expect.poll(() => requestedProofIds.includes(802)).toBe(true);

    await dialog
      .getByRole("button", { name: "Закрыть", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);

    const proofRequestCount = requestedProofIds.length;
    await page
      .getByRole("button", { name: "Подробнее о заказе №203" })
      .first()
      .click();

    dialog = page.getByRole("dialog", {
      name: "Детали заказа №203",
    });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId("order-payment-proof")).toContainText(
      "Подтверждение оплаты для этого заказа не приложено.",
    );
    await expect(
      dialog.getByRole("img", { name: /Подтверждение оплаты/ }),
    ).toHaveCount(0);
    await expect(dialog.getByTestId("order-tracking")).toHaveCount(0);
    expect(requestedProofIds).toHaveLength(proofRequestCount);
  });

  test("shows order quantity and the preorder payment breakdown", async ({
    context,
    page,
    baseURL,
  }) => {
    await authenticate(context, baseURL);

    const preorder = createOrderFixture({
      orderId: 301,
      actualStatus: "AWAITING_PAYMENT",
      peerId: 10,
      peerLogin: "seller-preorder",
      peerPhone: "+7 900 444-55-66",
      peerMail: "seller-preorder@example.com",
      deliveryAddress: "Россия, Москва, ул. Предзаказа, 1",
      histories: [],
      availability: "PREORDER",
      quantity: 2,
      unitPrice: 12_500,
      prepaymentAmount: 2_500,
      totalPrice: 20_000,
      createdAt: "17.07.2026 12:34:56",
    });

    await mockDashboardApi(page, { customerOrders: [preorder] });
    await page.goto("/dashboard/purchase", { waitUntil: "domcontentloaded" });
    await page
      .getByRole("button", { name: "Подробнее о заказе №301" })
      .first()
      .click();

    const dialog = page.getByRole("dialog", {
      name: "Детали заказа №301",
    });
    await expect(dialog).toBeVisible();
    await expect(dialog).not.toContainText("Дата неизвестна");
    await expect(dialog.getByTestId("order-quantity-301")).toHaveText(
      "Количество: 2 шт.",
    );

    const paymentBreakdown = dialog.getByTestId("order-payment-breakdown");
    await expect(paymentBreakdown).toContainText("Стоимость товаров");
    await expect(paymentBreakdown).toContainText("Предоплата");
    await expect(paymentBreakdown).toContainText("Остаток к оплате");
    await expect(paymentBreakdown).toContainText(/25\s*000/);
    await expect(paymentBreakdown).toContainText(/5\s*000/);
    await expect(paymentBreakdown).toContainText(/20\s*000/);
  });

  test("uses preorder-aware confirmation copy and keeps an error dialog open", async ({
    context,
    page,
    baseURL,
  }) => {
    await authenticate(context, baseURL);

    const bookedPreorder = createOrderFixture({
      orderId: 501,
      actualStatus: "BOOKED",
      peerId: 31,
      peerLogin: "buyer-booked-preorder",
      peerPhone: "+7 900 501-00-00",
      peerMail: "buyer-501@example.com",
      deliveryAddress: "Россия, Москва, ул. Предзаказа, 501",
      histories: [],
      availability: "PREORDER",
    });
    const prepaymentApproval = createOrderFixture({
      orderId: 502,
      actualStatus: "AWAITING_PREPAYMENT_APPROVAL",
      peerId: 32,
      peerLogin: "buyer-prepayment",
      peerPhone: "+7 900 502-00-00",
      peerMail: "buyer-502@example.com",
      deliveryAddress: "Россия, Москва, ул. Предзаказа, 502",
      histories: [],
      availability: "PREORDER",
    });
    let confirmationRequests = 0;

    await mockDashboardApi(page, {
      sellerOrders: [bookedPreorder, prepaymentApproval],
    });
    await page.route(
      "**/order/501/AWAITING_PREPAYMENT?*",
      async (route) => {
        if (route.request().method() !== "OPTIONS") {
          confirmationRequests += 1;
        }
        await fulfillServerError(route);
      },
    );

    await page.goto("/dashboard/sales", { waitUntil: "domcontentloaded" });
    await page
      .getByRole("button", { name: "Подтвердить предзаказ", exact: true })
      .first()
      .click();

    let dialog = page.getByRole("dialog", {
      name: "Подтвердить предзаказ",
    });
    await expect(dialog).toContainText("перейти к предоплате");
    await dialog
      .getByRole("button", { name: "Подтвердить предзаказ", exact: true })
      .click();
    await expect(dialog.getByRole("alert")).toContainText(
      "Не удалось выполнить подтверждение",
    );
    await expect(dialog).toBeVisible();
    expect(confirmationRequests).toBe(1);

    await dialog.getByRole("button", { name: "Отмена" }).click();
    await page
      .getByRole("button", { name: "Подтвердить предоплату", exact: true })
      .first()
      .click();

    dialog = page.getByRole("dialog", {
      name: "Подтвердить предоплату",
    });
    await expect(dialog).toContainText("перейти к оплате остатка");
  });

  test("validates tracking and preserves shipping input after an error", async ({
    context,
    page,
    baseURL,
  }) => {
    await authenticate(context, baseURL);

    const assemblingPreorder = createOrderFixture({
      orderId: 503,
      actualStatus: "ASSEMBLING",
      peerId: 33,
      peerLogin: "buyer-shipping",
      peerPhone: "+7 900 503-00-00",
      peerMail: "buyer-503@example.com",
      deliveryAddress: "Россия, Москва, ул. Доставки, 503",
      histories: [],
      availability: "PREORDER",
      quantity: 2,
      totalPrice: 20_000,
    });
    let shippingRequests = 0;

    await mockDashboardApi(page, { sellerOrders: [assemblingPreorder] });
    await page.route("**/order/503/ON_THE_WAY?*", async (route) => {
      if (route.request().method() !== "OPTIONS") {
        shippingRequests += 1;
      }
      await fulfillServerError(route);
    });

    await page.goto("/dashboard/sales", { waitUntil: "domcontentloaded" });
    await page
      .getByRole("button", { name: "Отправить товар", exact: true })
      .first()
      .click();

    const dialog = page.getByRole("dialog", { name: "Отправка товара" });
    const trackingInput = dialog.getByLabel("Ссылка для отслеживания");
    const commentInput = dialog.getByLabel("Комментарий (необязательно)");
    const submitButton = dialog.getByRole("button", {
      name: "Отправить товар",
      exact: true,
    });

    await expect(dialog.getByTestId("shipping-order-quantity-503")).toHaveText(
      "Количество: 2 шт.",
    );
    await expect(dialog.getByTestId("shipping-payment-breakdown")).toContainText(
      "Предоплата",
    );
    await expect(dialog.getByTestId("shipping-payment-breakdown")).toContainText(
      "Оплата остатка",
    );

    await trackingInput.fill("javascript:alert(1)");
    await expect(dialog).toContainText(
      "Укажите абсолютную ссылку, начинающуюся с http:// или https://",
    );
    await expect(submitButton).toBeDisabled();

    await trackingInput.fill("https://tracking.example.com/order/503");
    await commentInput.fill("Хрупкий груз");
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    await expect(dialog.getByRole("alert")).toContainText(
      "Не удалось отправить данные о доставке",
    );
    await expect(trackingInput).toHaveValue(
      "https://tracking.example.com/order/503",
    );
    await expect(commentInput).toHaveValue("Хрупкий груз");
    expect(shippingRequests).toBe(1);
  });

  test("keeps receipt confirmation open when the request fails", async ({
    context,
    page,
    baseURL,
  }) => {
    await authenticate(context, baseURL);

    const deliveredOrder = createOrderFixture({
      orderId: 504,
      actualStatus: "ON_THE_WAY",
      peerId: 34,
      peerLogin: "seller-receipt",
      peerPhone: "+7 900 504-00-00",
      peerMail: "seller-504@example.com",
      deliveryAddress: "Россия, Москва, ул. Получения, 504",
      deliveryUrl: "https://tracking.example.com/order/504",
      histories: [],
    });
    let receiptRequests = 0;

    await mockDashboardApi(page, { customerOrders: [deliveredOrder] });
    await page.route("**/order/504/COMPLETED?*", async (route) => {
      if (route.request().method() !== "OPTIONS") {
        receiptRequests += 1;
      }
      await fulfillServerError(route);
    });

    await page.goto("/dashboard/purchase", { waitUntil: "domcontentloaded" });
    await page
      .getByRole("button", { name: "Подтвердить получение", exact: true })
      .first()
      .click();

    const dialog = page.getByRole("dialog", {
      name: "Подтвердить получение заказа",
    });
    await dialog
      .getByRole("button", { name: "Подтвердить получение", exact: true })
      .click();

    await expect(dialog.getByRole("alert")).toContainText(
      "Не удалось подтвердить получение",
    );
    await expect(dialog).toBeVisible();
    expect(receiptRequests).toBe(1);
  });
});
