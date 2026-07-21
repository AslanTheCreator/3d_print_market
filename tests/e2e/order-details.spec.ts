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
}: OrderFixtureOptions) => ({
  orderId,
  actualStatus,
  totalPrice: 12_900,
  createdAt: "2026-07-10T10:00:00.000Z",
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
    count: 1,
    price: 12_500,
    prepaymentAmount: availability === "PREORDER" ? 2_500 : 0,
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
});
