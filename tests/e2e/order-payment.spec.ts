import { orderCalculation } from "./helpers/orderCalculation";
import { orderFixture, setupMobileAccount } from "./helpers/mobileAccount";
import {
  expect,
  type BrowserContext,
  type Locator,
  type Page,
  type Route,
  test,
} from "@playwright/test";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "DELETE, GET, OPTIONS, POST",
};

const transparentPngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const paymentProofFile = {
  name: "test-payment-proof.png",
  mimeType: "image/png",
  buffer: Buffer.from(transparentPngBase64, "base64"),
};

type PaymentStatus = "AWAITING_PREPAYMENT" | "AWAITING_PAYMENT";

interface PaymentApiOptions {
  orders: ReturnType<typeof createPreorder>[];
  events?: object[];
  accounts: unknown[];
  accountsStatus?: number;
  uploadImageId: number;
  failFirstMutation?: boolean;
  mutationFailure?: "http-409" | "network";
  successBody?: string;
  customerOrdersRefetchGate?: Promise<void>;
}

interface PaymentApiTracker {
  accountsRequestCount: number;
  customerOrdersRequestCount: number;
  deletedImageIds: number[];
  uploads: { entityId: string | null; authorization: string | undefined; body: string }[];
  statusComments: string[];
  statusHasAccountId: boolean[];
  statusImageIds: number[];
}

const oldPaymentRoutes = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const writes: string[] = [];
  oldPaymentRoutes.set(page, writes);
  page.on("request", request => {
    if (request.method() === "POST" && /\/order\/\d+\/(?:ASSEMBLING|AWAITING_PREPAYMENT_APPROVAL)(?:\?|$)/.test(request.url())) writes.push(request.url());
  });
});
test.afterEach(({ page }) => { expect(oldPaymentRoutes.get(page)).toEqual([]); });

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
      value: "order-payment-test-access-token",
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

const createPreorder = ({
  orderId,
  status,
  sellerId,
  quantity = 3,
  availability = "PREORDER",
  orderPrepaymentAmount = 2_500 * quantity,
}: {
  orderId: number;
  status: PaymentStatus;
  sellerId: number;
  quantity?: number;
  availability?: "PREORDER" | "EXTERNAL_PRODUCT";
  orderPrepaymentAmount?: number;
}) => ({
  orderId,
  actualStatus: status,
  termsVersion: 0,
  calculation: { known: true, currency: "RUB", scale: 2, goodsAmount: String(30000 + orderPrepaymentAmount),
    deliveryAmount: status === "AWAITING_PREPAYMENT" ? null : "600.00", totalAmount: status === "AWAITING_PREPAYMENT" ? null : String(30600 + orderPrepaymentAmount),
    confirmedPaidAmount: status === "AWAITING_PREPAYMENT" ? "0.00" : String(orderPrepaymentAmount), remainingAmount: status === "AWAITING_PREPAYMENT" ? null : "30600.00" },
  totalPrice: 30_000,
  prepaymentAmount: orderPrepaymentAmount,
  createdAt: "2026-07-20T10:00:00.000Z",
  userInfo: {
    id: sellerId,
    imageId: 0,
    login: `test-seller-${sellerId}`,
    phoneNumber: "+7 900 000-00-00",
    mail: `seller-${sellerId}@example.test`,
  },
  product: {
    id: orderId + 1_000,
    name: `Тестовый предзаказ ${orderId}`,
    count: quantity,
    price: 12_500,
    prepaymentAmount: 2_500,
    currency: "RUB",
    categories: [{ id: 1, name: "Фигурки", childs: [] }],
    imageId: 0,
    sellerId,
    expirationDate: "2030-01-01T00:00:00.000Z",
    status: "ACTIVE",
    availability,
    externalUrl: "",
    sellerLogin: `test-seller-${sellerId}`,
    sellerRating: 5,
    totalReviews: 1,
    createdAt: "2026-07-01T10:00:00.000Z",
  },
  transfer: {
    transferId: 51,
    addressId: 61,
    imageId: 0,
    address: "Россия, Москва, Тестовая улица, 1",
    price: 600,
    currency: "RUB",
  },
  images: [],
  deliveryUrl: "",
  histories: [
    {
      status: "BOOKED",
      comment: "Предзаказ создан",
      changedAt: "2026-07-20T10:00:00.000Z",
    },
    {
      status,
      comment: "Ожидается действие покупателя",
      changedAt: "2026-07-21T10:00:00.000Z",
    },
  ],
});

const createAccount = ({
  id,
  participantId,
  username,
  entityValue,
  transferMoney = "BANK_CARD",
}: {
  id: number;
  participantId: number;
  username: string;
  entityValue: string;
  transferMoney?: "BANK_CARD" | "BANK_SBP" | "CASH";
}) => ({
  id,
  participantId,
  username,
  entityValue,
  transferMoney,
  comment: "Тестовые реквизиты",
});

const mockPaymentApi = async (
  page: Page,
  {
    orders,
    events = [],
    accounts,
    accountsStatus = 200,
    uploadImageId,
    failFirstMutation = false,
    mutationFailure,
    successBody,
    customerOrdersRefetchGate,
  }: PaymentApiOptions,
): Promise<PaymentApiTracker> => {
  const tracker: PaymentApiTracker = {
    accountsRequestCount: 0,
    customerOrdersRequestCount: 0,
    deletedImageIds: [],
    uploads: [],
    statusComments: [],
    statusHasAccountId: [],
    statusImageIds: [],
  };
  let shouldWaitForCustomerReconciliation = false;

  await page.route("**/auth/profile", (route) =>
    fulfillJson(route, {
      id: 1,
      fullName: "Тестовый покупатель",
      login: "order-payment-customer",
      role: "USER",
      email: "customer@example.test",
      imageId: null,
      image: [],
      exp: 0,
      type: "access",
    }),
  );
  await page.route("**/basket/find", (route) => fulfillJson(route, []));
  await page.route("**/favorites/find", (route) => fulfillJson(route, []));
  await page.route("**/products/my", (route) => fulfillJson(route, []));
  await page.route("**/order/customer", async (route) => {
    if (route.request().method() === "OPTIONS") return fulfillJson(route, {});
    tracker.customerOrdersRequestCount += 1;

    if (
      shouldWaitForCustomerReconciliation &&
      customerOrdersRefetchGate
    ) {
      await customerOrdersRefetchGate;
    }

    await fulfillJson(route, orders);
  });
  await page.route("**/terms-history", route => fulfillJson(route, events));
  await page.route("**/order/seller", (route) => fulfillJson(route, []));
  await page.route("**/images/metadata?ids=*", (route) =>
    fulfillJson(route, []),
  );

  await page.route(/\/accounts\/participant\/\d+(?:\?.*)?$/, async (route) => {
    if (route.request().method() !== "OPTIONS") {
      tracker.accountsRequestCount += 1;
    }

    if (accountsStatus === 200) {
      await fulfillJson(route, accounts);
      return;
    }

    await fulfillJson(
      route,
      {
        code: "PAYMENT_ACCOUNTS_UNAVAILABLE",
        message: "Тестовая ошибка загрузки реквизитов",
        status: accountsStatus,
      },
      accountsStatus,
    );
  });

  await page.route(/\/images(?:\?.*)?$/, async (route) => {
    const method = route.request().method();
    const url = new URL(route.request().url());

    if (method === "POST" && url.searchParams.get("tag") === "ORDER") {
      tracker.uploads.push({ entityId: url.searchParams.get("entityId"), authorization: route.request().headers().authorization, body: route.request().postDataBuffer()?.toString() ?? "" });
      await fulfillJson(route, [uploadImageId]);
      return;
    }

    if (method === "DELETE" && url.searchParams.get("tag") === "ORDER") {
      tracker.deletedImageIds.push(
        ...url.searchParams
          .getAll("ids")
          .map(Number)
          .filter((imageId) => Number.isInteger(imageId)),
      );
      await fulfillJson(route, { message: "ORDER deletion forbidden" }, 403);
      return;
    }

    await fulfillJson(route, []);
  });

  await page.route(
    /\/order\/\d+\/payments\/(?:prepayment|full)(?:\?.*)?$/,
    async (route) => {
      if (route.request().method() === "OPTIONS") {
        await fulfillJson(route, {});
        return;
      }

      const url = new URL(route.request().url());
      const body = route.request().postDataJSON();
      const row = orders.find(o => o.orderId === Number(url.pathname.split("/")[2]))!;
      expect(body).toEqual({ expectedVersion: row.termsVersion, imageId: uploadImageId });
      expect(url.search).toBe("");
      tracker.statusComments.push(url.searchParams.get("comment") ?? "");
      tracker.statusHasAccountId.push(url.searchParams.has("accountId"));
      tracker.statusImageIds.push(
        body.imageId,
      );

      if (mutationFailure === "network") {
        shouldWaitForCustomerReconciliation = true;
        await route.abort("failed");
        return;
      }

      if (
        mutationFailure === "http-409" ||
        (failFirstMutation && tracker.statusImageIds.length === 1)
      ) {
        await fulfillJson(
          route,
          {
            code: mutationFailure === "http-409" ? "ORDER_TERMS_STALE" : "ORDER_PAYMENT_INVALID",
            message: "Статус заказа изменился, повторите попытку",
            status: mutationFailure === "http-409" ? 409 : 400,
          },
          mutationFailure === "http-409" ? 409 : 400,
        );
        return;
      }

      if (successBody !== undefined) {
        await route.fulfill({ status: 200, headers: corsHeaders, contentType: "application/json", body: successBody });
        return;
      }
      Object.assign(row, { actualStatus: url.pathname.endsWith("prepayment") ? "AWAITING_PREPAYMENT_APPROVAL" : "AWAITING_PAYMENT_APPROVAL",
        termsVersion: row.termsVersion + 1, paymentProofImageId: body.imageId });
      events.push({ kind: "PAYMENT_SUBMITTED", actor_id: 1, id: events.length + 1, payload: JSON.stringify(body) });
      await fulfillJson(route, row.orderId);
    },
  );

  return tracker;
};

const openPaymentDialog = async (
  page: Page,
  actionName: "Подтвердить оплату" | "Подтвердить предоплату",
) => {
  const action = page
    .getByRole("button", { name: actionName, exact: true })
    .first();
  await expect(action).toBeVisible({ timeout: 15_000 });
  await action.click();

  const dialog = page.getByRole("dialog", {
    name:
      actionName === "Подтвердить предоплату"
        ? "Подтверждение предоплаты"
        : "Подтверждение оплаты",
  });
  await expect(dialog).toBeVisible();
  return dialog;
};

const uploadPaymentProof = async (dialog: Locator) => {
  await dialog.locator('input[type="file"]').setInputFiles(paymentProofFile);
  await expect(
    dialog.getByText("Файл выбран", { exact: true }),
  ).toBeVisible();
};

test.describe("order payment flow", () => {
  test("empty and invalid upload cannot enter payment payload; the same file can be retried", async ({ context, page, baseURL }) => {
    await authenticate(context, baseURL);
    const tracker = await mockPaymentApi(page, {
      orders: [createPreorder({ orderId: 551, status: "AWAITING_PREPAYMENT", sellerId: 99 })],
      accounts: [createAccount({ id: 901, participantId: 99, username: "Получатель", entityValue: "TEST-ACCOUNT" })],
      uploadImageId: 9551,
    });
    await page.goto("/dashboard/purchase");
    const dialog = await openPaymentDialog(page, "Подтвердить предоплату");
    let uploads = 0;
    const badResponses = [null, "[]", "[null]", "[0]", "[-1]", '["9551"]', "[1.5]", "[9551,9552]", "[9551.0000000000000001]", "[9007199254740993]"];
    for (const [index, response] of badResponses.entries()) {
      await page.route("**/images?tag=ORDER&entityId=551", route => {
        if (route.request().method() !== "POST") return fulfillJson(route, null);
        uploads++;
        return response === null ? route.abort("failed") : route.fulfill({ status: 200, headers: corsHeaders, contentType: "application/json", body: response });
      });
      await dialog.locator('input[type="file"]').setInputFiles(paymentProofFile);
      await dialog.getByRole("button", { name: "Подтвердить предоплату", exact: true }).click();
      await expect(dialog.getByText("Не удалось загрузить изображение на сервер", { exact: true })).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Подтвердить предоплату", exact: true })).toBeEnabled();
      expect([uploads, tracker.statusImageIds.length]).toEqual([index + 1, 0]);
    }
    await page.unroute("**/images?tag=ORDER&entityId=551");
    await uploadPaymentProof(dialog);
    await dialog.getByRole("button", { name: "Подтвердить предоплату", exact: true }).click();
    await expect.poll(() => tracker.statusImageIds).toEqual([9551]);
    expect(tracker.uploads).toHaveLength(1);
  });

  test("shows quantity-aware amounts and local preview without upload or DELETE on close", async ({
    context,
    page,
    baseURL,
  }) => {
    await authenticate(context, baseURL);

    const sellerId = 77;
    const prepaymentOrder = createPreorder({
      orderId: 501,
      status: "AWAITING_PREPAYMENT",
      sellerId,
    });
    const paymentOrder = createPreorder({
      orderId: 502,
      status: "AWAITING_PAYMENT",
      sellerId,
    });
    const tracker = await mockPaymentApi(page, {
      orders: [prepaymentOrder, paymentOrder],
      accounts: [
        createAccount({
          id: 701,
          participantId: sellerId,
          username: "Единственный тестовый счёт",
          entityValue: "TEST-ACCOUNT-501",
        }),
      ],
      uploadImageId: 9_101,
    });

    await page.goto("/dashboard/purchase", {
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByTestId("order-quantity-501").first()).toHaveText(
      "Количество: 3 шт.",
    );

    const prepaymentDialog = await openPaymentDialog(
      page,
      "Подтвердить предоплату",
    );
    await expect(prepaymentDialog.getByText(/Приложите чек согласованной предоплаты/)).toBeVisible();
    await expect(prepaymentDialog.getByText(/К предоплате:/)).toHaveCount(0);
    await expect(prepaymentDialog.getByText(/^Осталось оплатить:/)).toContainText("Остаток пока неизвестен");
    await expect(prepaymentDialog.getByText(/^Товары:/)).toContainText(/37\s500,00\s*₽/);
    await expect(
      prepaymentDialog.getByText("TEST-ACCOUNT-501", { exact: true }),
    ).toBeHidden();
    expect(tracker.accountsRequestCount).toBe(0);

    await uploadPaymentProof(prepaymentDialog);
    await expect(
      prepaymentDialog.getByRole("button", {
        name: "Подтвердить предоплату",
        exact: true,
      }),
    ).toBeEnabled();

    await prepaymentDialog
      .getByRole("button", { name: "Отмена", exact: true })
      .click();
    await expect(prepaymentDialog).toBeHidden();
    await expect.poll(() => tracker.deletedImageIds).toEqual([]);
    expect(tracker.statusImageIds).toEqual([]);
    expect(tracker.uploads).toEqual([]);

    const paymentDialog = await openPaymentDialog(
      page,
      "Подтвердить оплату",
    );
    await expect(
      paymentDialog.getByText(/^Осталось оплатить:/),
    ).toContainText(/30\s600,00\s*₽/);
    await expect(paymentDialog.getByText(/^Подтверждено оплачено:/)).toContainText(
      /7\s500,00\s*₽/,
    );
    await paymentDialog
      .getByRole("button", { name: "Отмена", exact: true })
      .click();
    await expect(paymentDialog).toBeHidden();
  });

  const blockedAccountScenarios = [
    {
      name: "account request fails",
      orderId: 511,
      accountsStatus: 500,
      expectedMessage: "Не удалось загрузить реквизиты продавца.",
    },
    {
      name: "account list is empty",
      orderId: 512,
      accountsStatus: 200,
      expectedMessage: "У продавца не указаны реквизиты для оплаты.",
    },
  ] as const;

  for (const scenario of blockedAccountScenarios) {
    test(`blocks confirmation when ${scenario.name}`, async ({
      context,
      page,
      baseURL,
    }) => {
      await authenticate(context, baseURL);

      const order = createPreorder({
        orderId: scenario.orderId,
        status: "AWAITING_PAYMENT",
        sellerId: scenario.orderId + 1_000,
      });
      const tracker = await mockPaymentApi(page, {
        orders: [order],
        accounts: [],
        accountsStatus: scenario.accountsStatus,
        uploadImageId: scenario.orderId + 9_000,
      });

      await page.goto("/dashboard/purchase", {
        waitUntil: "domcontentloaded",
      });
      const dialog = await openPaymentDialog(
        page,
        "Подтвердить оплату",
      );
      await uploadPaymentProof(dialog);

      await expect(dialog.getByText(scenario.expectedMessage)).toBeVisible({
        timeout: 15_000,
      });
      const confirmButton = dialog.getByRole("button", {
        name: "Подтвердить оплату",
        exact: true,
      });
      await expect(confirmButton).toBeDisabled();

      if (scenario.accountsStatus === 500) {
        await dialog
          .getByRole("button", { name: "Повторить", exact: true })
          .click();
        await expect
          .poll(() => tracker.accountsRequestCount, { timeout: 15_000 })
          .toBeGreaterThanOrEqual(3);
        await expect(dialog.getByText(scenario.expectedMessage)).toBeVisible({
          timeout: 15_000,
        });
        await expect(confirmButton).toBeDisabled();
      }

      await dialog
        .getByRole("button", { name: "Отмена", exact: true })
        .click();
      await expect(dialog).toBeHidden();
      await expect.poll(() => tracker.deletedImageIds).toEqual([]);
      expect(tracker.statusImageIds).toEqual([]);
    });
  }

  test("blocks multiple accounts until the customer selects one", async ({
    context,
    page,
    baseURL,
  }) => {
    await authenticate(context, baseURL);

    const sellerId = 88;
    const tracker = await mockPaymentApi(page, {
      orders: [
        createPreorder({
          orderId: 521,
          status: "AWAITING_PAYMENT",
          sellerId,
        }),
      ],
      accounts: [
        createAccount({
          id: 801,
          participantId: sellerId,
          username: "Первый тестовый получатель",
          entityValue: "TEST-ACCOUNT-FIRST",
        }),
        createAccount({
          id: 802,
          participantId: sellerId,
          username: "Второй тестовый получатель",
          entityValue: "TEST-ACCOUNT-SECOND",
          transferMoney: "BANK_SBP",
        }),
      ],
      uploadImageId: 9_201,
    });

    await page.goto("/dashboard/purchase", {
      waitUntil: "domcontentloaded",
    });
    const dialog = await openPaymentDialog(
      page,
      "Подтвердить оплату",
    );
    await uploadPaymentProof(dialog);

    const confirmButton = dialog.getByRole("button", {
      name: "Подтвердить оплату",
      exact: true,
    });
    await expect(confirmButton).toBeDisabled();
    await dialog
      .getByText("Второй тестовый получатель", { exact: true })
      .first()
      .click();
    await expect(
      dialog.getByText("TEST-ACCOUNT-SECOND", { exact: true }),
    ).toBeVisible();
    await expect(confirmButton).toBeEnabled();

    await dialog
      .getByRole("button", { name: "Отмена", exact: true })
      .click();
    await expect(dialog).toBeHidden();
    await expect.poll(() => tracker.deletedImageIds).toEqual([]);
    expect(tracker.statusImageIds).toEqual([]);
  });

  test("keeps the uploaded ORDER file when closing after HTTP 409", async ({
    context,
    page,
    baseURL,
  }) => {
    await authenticate(context, baseURL);

    const sellerId = 98;
    const tracker = await mockPaymentApi(page, {
      orders: [
        createPreorder({
          orderId: 530,
          status: "AWAITING_PREPAYMENT",
          sellerId,
        }),
      ],
      accounts: [
        createAccount({
          id: 900,
          participantId: sellerId,
          username: "Тестовый получатель для HTTP-ошибки",
          entityValue: "TEST-ACCOUNT-HTTP-ERROR",
        }),
      ],
      uploadImageId: 9_300,
      mutationFailure: "http-409",
    });

    await page.goto("/dashboard/purchase", {
      waitUntil: "domcontentloaded",
    });
    const dialog = await openPaymentDialog(
      page,
      "Подтвердить предоплату",
    );
    await uploadPaymentProof(dialog);

    await dialog
      .getByRole("button", {
        name: "Подтвердить предоплату",
        exact: true,
      })
      .click();
    await expect(
      dialog.getByText("Статус заказа изменился, повторите попытку", {
        exact: true,
      }),
    ).toBeVisible();

    await dialog
      .getByRole("button", { name: "Отмена", exact: true })
      .click();
    await expect(dialog).toBeHidden();
    await expect.poll(() => tracker.deletedImageIds).toEqual([]);
    expect([tracker.uploads.length, tracker.statusImageIds.length]).toEqual([1, 1]);
  });

  test("keeps proof and mutation pending until reconciliation after a network error", async ({
    context,
    page,
    baseURL,
  }) => {
    await authenticate(context, baseURL);

    let releaseCustomerOrdersRefetch: () => void = () => undefined;
    const customerOrdersRefetchGate = new Promise<void>((resolve) => {
      releaseCustomerOrdersRefetch = resolve;
    });
    const events: object[] = [];
    const sellerId = 97;
    const order = createPreorder({ orderId: 529, status: "AWAITING_PREPAYMENT", sellerId });
    const tracker = await mockPaymentApi(page, {
      orders: [
        order,
        createPreorder({ orderId: 530, status: "AWAITING_PAYMENT", sellerId }),
      ],
      accounts: [
        createAccount({
          id: 899,
          participantId: sellerId,
          username: "Тестовый получатель для network error",
          entityValue: "TEST-ACCOUNT-NETWORK-ERROR",
        }),
      ],
      uploadImageId: 9_299,
      mutationFailure: "network",
      customerOrdersRefetchGate, events,
    });

    await page.goto("/dashboard/purchase", {
      waitUntil: "domcontentloaded",
    });
    const dialog = await openPaymentDialog(
      page,
      "Подтвердить предоплату",
    );
    await uploadPaymentProof(dialog);
    const initialCustomerOrdersRequests =
      tracker.customerOrdersRequestCount;

    await dialog
      .getByRole("button", {
        name: "Подтвердить предоплату",
        exact: true,
      })
      .click();

    try {
      await expect
        .poll(() => tracker.customerOrdersRequestCount)
        .toBeGreaterThan(initialCustomerOrdersRequests);
      await expect(
        dialog.getByRole("button", {
          name: "Подтверждение...",
          exact: true,
        }),
      ).toBeDisabled();
      await expect(
        dialog.getByRole("button", { name: "Отмена", exact: true }),
      ).toBeDisabled();
      await expect(dialog.locator('input[type="file"]')).toBeDisabled();
      expect(tracker.deletedImageIds).toEqual([]);
    } finally {
      releaseCustomerOrdersRefetch();
    }

    await expect(dialog.getByText(/Результат отправки чека неизвестен/)).toBeVisible();
    const confirm = dialog.getByRole("button", { name: "Подтвердить предоплату", exact: true });
    const check = dialog.getByRole("button", { name: "Проверить результат" });
    await expect(confirm).toBeDisabled();
    await expect(dialog.getByText(/Результат отправки чека неизвестен/)).toBeVisible();
    const reads = tracker.customerOrdersRequestCount;
    await check.click();
    await expect.poll(() => tracker.customerOrdersRequestCount).toBeGreaterThan(reads);
    await expect(confirm).toBeDisabled();
    await expect(dialog.locator('input[type="file"]')).toBeDisabled();

    await dialog
      .getByRole("button", { name: "Отмена", exact: true })
      .click();
    await expect(dialog).toBeHidden();
    const other = await openPaymentDialog(page, "Подтвердить оплату");
    await uploadPaymentProof(other);
    await expect(other.getByRole("button", { name: "Подтвердить оплату", exact: true })).toBeEnabled();
    await other.getByRole("button", { name: "Отмена", exact: true }).click();
    await openPaymentDialog(page, "Подтвердить предоплату");
    await expect(confirm).toBeDisabled();
    await confirm.evaluate(button => button.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    Object.assign(order, { actualStatus: "AWAITING_PREPAYMENT_APPROVAL", paymentProofImageId: 888 });
    await check.click();
    await expect(dialog).toBeHidden();
    const unknown = page.getByRole("alert").filter({ hasText: "Заказ №529. Результат отправки чека неизвестен" });
    await expect(unknown).toBeVisible();
    events.push({ id: 1, actor_id: 1, kind: "PAYMENT_SUBMITTED", payload: '{"expectedVersion":0,"imageId":9299}' });
    Object.assign(order, { termsVersion: 1, paymentProofImageId: 9299 });
    await unknown.getByRole("button", { name: "Проверить результат" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Заказ №529. Чек передан на проверку" })).toBeVisible();
    await expect(unknown).toHaveCount(0);
    expect(tracker.statusImageIds).toEqual([9299]);
    expect(tracker.uploads).toHaveLength(1);
    expect(tracker.deletedImageIds).toEqual([]);
  });

  test("late prepayment review requires this proof and a new history entry for its stage", async ({ page, context, baseURL }) => {
    await authenticate(context, baseURL);
    const order = createPreorder({ orderId: 545, status: "AWAITING_PREPAYMENT", sellerId: 97 });
    const review = { status: "AWAITING_PREPAYMENT_APPROVAL", comment: "", changedAt: "21.07.2026 14:00:00" };
    const events: object[] = [];
    order.histories.push(review, { status: "AWAITING_PREPAYMENT", comment: "", changedAt: "21.07.2026 15:00:00" });
    const tracker = await mockPaymentApi(page, {
      orders: [order], accounts: [createAccount({ id: 900, participantId: 97, username: "Получатель", entityValue: "TEST-545" })],
      uploadImageId: 9545, mutationFailure: "network", events,
    });
    await page.goto("/dashboard/purchase");
    const dialog = await openPaymentDialog(page, "Подтвердить предоплату");
    await uploadPaymentProof(dialog);
    await dialog.getByRole("button", { name: "Подтвердить предоплату", exact: true }).click();
    await expect(dialog.getByText(/Результат отправки чека неизвестен/)).toBeVisible();
    await dialog.getByRole("button", { name: "Отмена", exact: true }).click();
    await expect(dialog).toBeHidden();
    const list = page.getByTestId("desktop-orders");
    const unknown = list.getByRole("alert").filter({ hasText: /Результат отправки чека неизвестен/ });
    const check = async () => {
      await Promise.all([
        page.waitForResponse(r => r.request().method() === "GET" && new URL(r.url()).pathname === "/order/customer"),
        unknown.first().getByRole("button", { name: "Проверить результат" }).click(),
      ]);
    };
    const next = createPreorder({ orderId: 545, status: "AWAITING_PAYMENT", sellerId: 97 });
    Object.assign(order, { actualStatus: next.actualStatus, calculation: next.calculation, paymentProofImageId: 9545 });
    await check();
    await expect(list.getByRole("button", { name: "Подтвердить оплату", exact: true }).first()).toBeEnabled();
    await expect(unknown.first()).toBeVisible();
    order.histories.push(
      { ...review, changedAt: "21.07.2026 16:00:00" },
      { status: "AWAITING_PAYMENT", comment: "", changedAt: "21.07.2026 17:00:00" },
    );
    Object.assign(order, { paymentProofImageId: 888 });
    await check();
    await expect(unknown.first()).toBeVisible();
    events.push({ id: 1, actor_id: 1, kind: "PAYMENT_SUBMITTED", payload: '{"expectedVersion":0,"imageId":9545}' },
      { id: 2, actor_id: 97, kind: "PAYMENT_APPROVED", payload: '{"request":{"expectedVersion":1},"imageId":9545,"confirmedPaidAmount":"7500.00"}' });
    Object.assign(order, { termsVersion: 2, paymentProofImageId: 9545 });
    await check();
    await expect(list.getByRole("alert").filter({ hasText: /Платёж подтверждён по истории заказа/ }).first()).toBeVisible();
    await expect(unknown).toHaveCount(0);
    expect(tracker.statusImageIds).toEqual([9545]);
    expect(tracker.uploads).toHaveLength(1);
  });

  for (const [label, successBody] of [["null", "null"], ["empty", ""], ["another order", "541"], ["string ID", '"540"']]) {
    test(`HTTP 200 with ${label} keeps a single submission across reads and reopen`, async ({ page, context, baseURL }) => {
      await authenticate(context, baseURL);
      const order = createPreorder({ orderId: 540, status: "AWAITING_PAYMENT", sellerId: 97 });
      const tracker = await mockPaymentApi(page, {
        orders: [order], accounts: [createAccount({ id: 899, participantId: 97, username: "Получатель", entityValue: "TEST-540" })],
        uploadImageId: 9540, successBody,
      });
      await page.goto("/dashboard/purchase");
      const dialog = await openPaymentDialog(page, "Подтвердить оплату");
      await uploadPaymentProof(dialog);
      const submit = dialog.getByRole("button", { name: "Подтвердить оплату", exact: true });
      await submit.click();
      await expect(dialog.getByText(/Результат отправки чека неизвестен/)).toBeVisible();
      await dialog.getByRole("button", { name: "Отмена", exact: true }).click();
      await expect(dialog).toBeHidden();
      await openPaymentDialog(page, "Подтвердить оплату");
      await Promise.all([
        page.waitForResponse(r => r.request().method() === "GET" && new URL(r.url()).pathname === "/order/customer"),
        dialog.getByRole("button", { name: "Проверить результат" }).click(),
      ]);
      await expect(dialog.getByText(/Результат отправки чека неизвестен/)).toBeVisible();
      await expect(dialog.locator('input[type="file"]')).toBeDisabled();
      await expect(submit).toBeDisabled();
      await expect(dialog.getByText("TEST-540")).toBeHidden();
      await expect(dialog.getByRole("button", { name: /Скопировать/ })).toHaveCount(0);
      await submit.evaluate(button => button.dispatchEvent(new MouseEvent("click", { bubbles: true })));
      expect(tracker.uploads).toHaveLength(1);
      expect(tracker.statusImageIds).toEqual([9540]);
    });
  }

  test("keeps the dialog and uploaded image after a mutation error, then retries with the same imageId", async ({
    context,
    page,
    baseURL,
  }) => {
    await authenticate(context, baseURL);

    const sellerId = 99;
    const tracker = await mockPaymentApi(page, {
      orders: [
        createPreorder({
          orderId: 531,
          status: "AWAITING_PREPAYMENT",
          sellerId,
        }),
      ],
      accounts: [
        createAccount({
          id: 901,
          participantId: sellerId,
          username: "Тестовый получатель для retry",
          entityValue: "TEST-ACCOUNT-RETRY",
        }),
      ],
      uploadImageId: 9_301,
      failFirstMutation: true,
    });

    await page.goto("/dashboard/purchase", {
      waitUntil: "domcontentloaded",
    });
    const dialog = await openPaymentDialog(
      page,
      "Подтвердить предоплату",
    );
    await uploadPaymentProof(dialog);

    await expect(dialog.getByLabel("Комментарий (необязательно)")).toHaveCount(0);

    const confirmButton = dialog.getByRole("button", {
      name: "Подтвердить предоплату",
      exact: true,
    });
    await confirmButton.click();

    await expect(
      dialog.getByText("Статус заказа изменился, повторите попытку", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(dialog).toBeVisible();

    expect(tracker.uploads).toHaveLength(1);
    expect(tracker.uploads[0].entityId).toBe("531");
    expect(tracker.uploads[0].authorization).toMatch(/^Bearer /);
    expect(tracker.uploads[0].body).toContain('name="files"');
    await expect(dialog.locator('input[type="file"]')).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Удалить выбранный файл" })).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "Выбрать другой чек" })).toBeEnabled();

    await expect(
      dialog.getByText("Изображение загружено", { exact: true }),
    ).toBeVisible();
    await expect(confirmButton).toBeEnabled();

    await confirmButton.click();
    await expect(dialog).toBeHidden();

    expect(tracker.statusImageIds).toEqual([9_301, 9_301]);
    expect(tracker.statusComments).toEqual(["", ""]);
    expect(tracker.statusHasAccountId).toEqual([false, false]);
    expect(tracker.deletedImageIds).toEqual([]);
  });
});


for (const width of [393, 1280]) {
  for (const scenario of [
    { status: "AWAITING_PREPAYMENT", prepaymentAmount: 1_200, action: "Подтвердить предоплату", endpoint: "payments/prepayment" },
    { status: "AWAITING_PAYMENT", prepaymentAmount: 1_200, action: "Подтвердить оплату", endpoint: "payments/full" },
    { status: "AWAITING_PAYMENT", prepaymentAmount: 0, action: "Подтвердить оплату", endpoint: "payments/full" },
  ] as const) {
    test('external payment uses server totals: ' + scenario.status + ', prepayment ' + scenario.prepaymentAmount + ', width ' + width, async ({ context, page, baseURL }) => {
      await page.setViewportSize({ width, height: 900 });
      await authenticate(context, baseURL);
      const order = createPreorder({
        orderId: 801, status: scenario.status, sellerId: 77, quantity: 3,
        availability: "EXTERNAL_PRODUCT", orderPrepaymentAmount: scenario.prepaymentAmount,
      });
      const tracker = await mockPaymentApi(page, {
        orders: [order],
        accounts: [createAccount({ id: 701, participantId: 77, username: "Тестовый счёт", entityValue: "TEST-ACCOUNT" })],
        uploadImageId: 9_101,
      });
      await page.goto('/dashboard/purchase');
      await page.getByRole('button', { name: 'Подробнее о заказе №801' }).first().click();
      const details = page.getByRole('dialog', { name: 'Детали заказа №801' });
      const breakdown = details.getByTestId('order-payment-breakdown');
      await expect(breakdown).toContainText(scenario.prepaymentAmount > 0 ? /31\s*200/ : /30\s*000/);
      await expect(breakdown).not.toContainText(/37\s*500/);
      await expect(breakdown.getByText(/^Подтверждено оплачено:/)).toContainText(scenario.status === "AWAITING_PAYMENT" && scenario.prepaymentAmount > 0 ? /1\s200,00/ : /: 0,00/);
      await details.getByRole('button', { name: 'Закрыть детали заказа' }).click();
      const dialog = await openPaymentDialog(page, scenario.action);
      await expect(dialog.getByText(/^Осталось оплатить:/)).toContainText(scenario.status === "AWAITING_PAYMENT" ? /30\s600,00/ : "Остаток пока неизвестен");
      await expect(dialog.getByText(/^К предоплате:/)).toHaveCount(0);
      await uploadPaymentProof(dialog);
      const request = page.waitForRequest((request) => request.method() === 'POST' && new URL(request.url()).pathname === '/order/801/' + scenario.endpoint);
      await dialog.getByRole('button', { name: scenario.action, exact: true }).click();
      const mutation = await request;
      expect(mutation.headers().authorization).toBe('Bearer order-payment-test-access-token');
      await expect.poll(() => tracker.statusImageIds).toEqual([9_101]);
      await expect(dialog).toBeHidden();
    });
  }
}

for (const role of ["purchase", "sales"] as const) {
  test("missing calculation blocks monetary actions and preserves the order for " + role, async ({ page, baseURL }) => {
    const state = await setupMobileAccount(page, baseURL);
    const buyer = role === "purchase";
    const order = orderFixture(91, buyer ? "AWAITING_PAYMENT" : "AWAITING_PREPAYMENT_APPROVAL", 1, {});
    state[buyer ? "customerOrders" : "sellerOrders"] = [order];
    const writes: string[] = [];
    page.on("request", request => { if (request.method() === "POST" && /\/(order|images)[/?]/.test(request.url())) writes.push(request.url()); });
    await page.goto("/dashboard/" + role);
    const action = page.getByRole("button", { name: buyer ? "Подтвердить оплату" : "Подтвердить предоплату", exact: true }).first();
    await expect(action).toBeDisabled();
    await page.getByRole("button", { name: "Подробнее о заказе №91" }).first().click();
    const detail = page.getByRole("dialog");
    await expect(detail.getByText("Актуальный расчёт не получен", { exact: true })).toBeVisible();
    await expect(detail.getByText(/по старым данным: 2500 RUB/)).toBeVisible();
    Object.assign(order, { termsVersion: 0, calculation: orderCalculation({ known: false }) });
    await detail.getByRole("button", { name: "Обновить заказ" }).click();
    await expect(detail.getByText("Для оплаты нужна сверка администратором")).toBeVisible();
    await detail.getByRole("button", { name: "Закрыть детали заказа" }).click();
    await expect(action).toBeDisabled();
    expect(writes).toEqual([]);
  });
}

for (const point of ["before upload", "after upload"] as const) {
  test("изменение версии " + point + " требует повторного согласия", async ({ context, page, baseURL }) => {
    await authenticate(context, baseURL);
    const order = createPreorder({ orderId: 616, status: "AWAITING_PREPAYMENT", sellerId: 99 });
    await page.setViewportSize({ width: point === "before upload" ? 393 : 1280, height: 900 });
    Object.assign(order, { deliveryCarrier: "OZON", deliveryAddress: "Старый ПВЗ" });
    const tracker = await mockPaymentApi(page, { orders: [order], accounts: [], uploadImageId: 7616 });
    await page.goto("/dashboard/purchase");
    const dialog = await openPaymentDialog(page, "Подтвердить предоплату");
    await uploadPaymentProof(dialog);
    const changeDelivery = () => Object.assign(order, { termsVersion: 1, deliveryCarrier: "YANDEX", deliveryAddress: "Новый ПВЗ на Полевой" });
    if (point === "before upload") changeDelivery();
    else {
      await page.route("**/images?tag=ORDER&entityId=616", async route => {
        if (route.request().method() === "POST") changeDelivery();
        await route.fallback();
      });
    }
    const submit = dialog.getByRole("button", { name: "Подтвердить предоплату", exact: true });
    await submit.click();
    const acknowledge = dialog.getByRole("button", { name: "Чек соответствует новым условиям" });
    await expect(acknowledge).toBeEnabled();
    const change = dialog.getByRole("alert").filter({ hasText: "Чек соответствует новым условиям" });
    await expect(change.getByText("Служба доставки: Яндекс")).toBeVisible();
    await expect(change.getByText("Новый ПВЗ на Полевой")).toBeVisible();
    await expect(submit).toBeDisabled();
    expect([tracker.uploads.length, tracker.statusImageIds.length]).toEqual([point === "before upload" ? 0 : 1, 0]);
    await acknowledge.click();
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(dialog).toBeHidden();
    expect([tracker.uploads.length, tracker.statusImageIds.length]).toEqual([1, 1]);
  });
}

test("Enter и requestSubmit одновременно с click резервируют один upload и один POST; HTTP 408 разрешает только GET", async ({ context, page, baseURL }) => {
  await authenticate(context, baseURL);
  const order = createPreorder({ orderId: 618, status: "AWAITING_PREPAYMENT", sellerId: 99 });
  const tracker = await mockPaymentApi(page, { orders: [order], accounts: [], uploadImageId: 7618 });
  let posts = 0;
  await page.route("**/order/618/payments/prepayment", route => {
    if (route.request().method() === "POST") posts++;
    return fulfillJson(route, { code: "INVALID_REQUEST" }, 408);
  });
  await page.goto("/dashboard/purchase");
  const dialog = await openPaymentDialog(page, "Подтвердить предоплату");
  await uploadPaymentProof(dialog);
  const submit = dialog.getByRole("button", { name: "Подтвердить предоплату", exact: true });
  await submit.focus();
  await submit.evaluate(el => {
    const button = el as HTMLButtonElement;
    const form = button.form!;
    form.addEventListener("submit", () => {
      button.click();
      form.requestSubmit();
      form.requestSubmit();
    }, { once: true });
  });
  await page.keyboard.press("Enter");
  await expect(dialog.getByText(/Результат отправки чека неизвестен/)).toBeVisible();
  const check = dialog.getByRole("button", { name: "Проверить результат" });
  await check.click();
  await expect(check).toBeEnabled();
  expect([tracker.uploads.length, posts]).toEqual([1, 1]);
});

test("после потери ответа возврат до контрольного GET показывает причину и очищает выбор", async ({ context, page, baseURL }) => {
  await authenticate(context, baseURL);
  const order = createPreorder({ orderId: 619, status: "AWAITING_PREPAYMENT", sellerId: 99 });
  const events: object[] = [];
  const tracker = await mockPaymentApi(page, { orders: [order], accounts: [], uploadImageId: 7619, mutationFailure: "network", events });
  await page.goto("/dashboard/purchase");
  const dialog = await openPaymentDialog(page, "Подтвердить предоплату");
  await uploadPaymentProof(dialog);
  const submit = dialog.getByRole("button", { name: "Подтвердить предоплату", exact: true });
  await submit.click();
  const check = dialog.getByRole("button", { name: "Проверить результат" });
  await expect(check).toBeEnabled();
  events.push({ id: 4, actor_id: 1, kind: "PAYMENT_SUBMITTED", payload: '{"expectedVersion":0,"imageId":7619}' },
    { id: 5, actor_id: 99, kind: "PAYMENT_RETURNED", payload: '{"request":{"expectedVersion":1,"reason":"Чек нечитаем"},"imageId":7619,"confirmedPaidAmount":"0.00"}' });
  order.termsVersion = 2;
  await check.click();
  await expect(dialog.getByText("Причина возврата чека: Чек нечитаем")).toBeVisible();
  await expect(check).toHaveCount(0);
  await expect(dialog.getByText(/Изображение загружено|Файл выбран/)).toHaveCount(0);
  await expect(submit).toBeDisabled();
  await uploadPaymentProof(dialog);
  await dialog.getByRole("button", { name: "Чек соответствует новым условиям" }).click();
  await expect(submit).toBeEnabled();
  expect([tracker.uploads.length, tracker.statusImageIds.length]).toEqual([1, 1]);
});

test("недоступная исходная история не позволяет приписать найденный позже чек этой попытке", async ({ context, page, baseURL }) => {
  await authenticate(context, baseURL);
  const order = createPreorder({ orderId: 620, status: "AWAITING_PREPAYMENT", sellerId: 99 });
  const events: object[] = [];
  const tracker = await mockPaymentApi(page, { orders: [order], accounts: [], uploadImageId: 7620, mutationFailure: "network", events });
  let unavailable = true;
  await page.route("**/order/620/terms-history", route => unavailable ? fulfillJson(route, {}, 503) : route.fallback());
  await page.goto("/dashboard/purchase");
  const dialog = await openPaymentDialog(page, "Подтвердить предоплату");
  await uploadPaymentProof(dialog);
  await dialog.getByRole("button", { name: "Подтвердить предоплату", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Проверить результат" })).toBeEnabled();
  unavailable = false;
  events.push({ id: 1, actor_id: 1, kind: "PAYMENT_SUBMITTED", payload: '{"expectedVersion":0,"imageId":7620}' });
  Object.assign(order, { termsVersion: 1, actualStatus: "AWAITING_PREPAYMENT_APPROVAL", paymentProofImageId: 7620 });
  await dialog.getByRole("button", { name: "Проверить результат" }).click();
  await expect(dialog).toBeHidden();
  const alert = page.getByRole("alert").filter({ hasText: /Заказ №620.*Результат отправки чека неизвестен/ });
  await expect(alert.first().getByRole("button", { name: "Проверить результат" })).toBeEnabled();
  expect([tracker.uploads.length, tracker.statusImageIds.length]).toEqual([1, 1]);
});

test("принятый чек и ошибочный контрольный GET истории: поздний старый ответ не снимает защиту", async ({ context, page, baseURL }) => {
  await authenticate(context, baseURL);
  const order = createPreorder({ orderId: 621, status: "AWAITING_PREPAYMENT", sellerId: 99 });
  const tracker = await mockPaymentApi(page, { orders: [order], accounts: [], uploadImageId: 7621 });
  let reads = 0, disrupted = true, release!: () => void;
  const first = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/order/621/terms-history", async route => {
    if (route.request().method() !== "GET") return fulfillJson(route, null);
    if (++reads === 1) {
      await first;
      await fulfillJson(route, []).catch(() => {});
      return;
    }
    if (disrupted && tracker.statusImageIds.length) return fulfillJson(route, { message: "История недоступна" }, 503);
    await route.fallback();
  });
  await page.goto("/dashboard/purchase");
  const dialog = await openPaymentDialog(page, "Подтвердить предоплату");
  try {
    await expect.poll(() => reads).toBe(1);
    await uploadPaymentProof(dialog);
    await dialog.getByRole("button", { name: "Подтвердить предоплату", exact: true }).click();
    await expect.poll(() => reads).toBeGreaterThanOrEqual(3);
  } finally { release(); }
  const recovery = page.getByRole("alert").filter({ hasText: "Требуется контрольная проверка заказа и истории." }).first();
  await expect(recovery).toBeVisible();
  await expect(recovery.getByText("Чек передан на проверку")).toBeVisible();
  disrupted = false;
  await recovery.getByRole("button", { name: "Проверить результат" }).click();
  await expect(recovery).toHaveCount(0);
  await expect(page.getByRole("alert").filter({ hasText: "Чек передан на проверку" }).first()).toBeVisible();
  expect([tracker.uploads.length, tracker.statusImageIds.length]).toEqual([1, 1]);
});

test("ORDER_CASE_ALREADY_OPEN перечитывает адресные обращения и сохраняет чек до разрешения", async ({ context, page, baseURL }) => {
  await authenticate(context, baseURL);
  const order = createPreorder({ orderId: 622, status: "AWAITING_PREPAYMENT", sellerId: 99 });
  const tracker = await mockPaymentApi(page, { orders: [order], accounts: [], uploadImageId: 7622 });
  let posts = 0, open = true, caseReads = 0;
  await page.route("**/order/622/payments/prepayment", route => {
    if (route.request().method() === "POST") posts++;
    return fulfillJson(route, { code: "ORDER_CASE_ALREADY_OPEN", message: "Открыто обращение" }, 409);
  });
  await page.route("**/order/622/cases", route => {
    if (route.request().method() === "GET") caseReads++;
    return fulfillJson(route, [{ orderCase: { orderId: 622, state: open ? "OPEN" : "RESOLVED" } }]);
  });
  await page.goto("/dashboard/purchase");
  const dialog = await openPaymentDialog(page, "Подтвердить предоплату");
  await uploadPaymentProof(dialog);
  const submit = dialog.getByRole("button", { name: "Подтвердить предоплату", exact: true });
  await submit.click();
  await expect(dialog.getByText("Открыто обращение", { exact: true })).toBeVisible();
  await expect.poll(() => caseReads).toBeGreaterThan(0);
  await expect(submit).toBeDisabled();
  open = false;
  await dialog.getByRole("button", { name: "Проверить результат" }).click();
  await expect(submit).toBeEnabled();
  await expect(dialog.getByText("Изображение загружено")).toBeVisible();
  expect([tracker.uploads.length, posts]).toEqual([1, 1]);
});

for (const [status, code] of [[400, "BAD_REQUEST"], [400, "INVALID_REQUEST"], [403, "ACCESS_DENIED"], [404, "ORDER_NOT_FOUND"],
  [404, "IMAGE_NOT_FOUND"], [409, "ORDER_LEGACY_RECONCILIATION_REQUIRED"]] as const) {
  test("подтверждённый отказ " + code + " обновляет заказ без повтора", async ({ context, page, baseURL }) => {
    await authenticate(context, baseURL);
    const order = createPreorder({ orderId: 623, status: "AWAITING_PREPAYMENT", sellerId: 99 });
    const tracker = await mockPaymentApi(page, { orders: [order], accounts: [], uploadImageId: 7623 });
    let posts = 0, readsAtPost = 0;
    await page.route("**/order/623/payments/prepayment", route => {
      if (route.request().method() === "POST") { posts++; readsAtPost = tracker.customerOrdersRequestCount; }
      return fulfillJson(route, { code, message: "Причина отказа " + code }, status);
    });
    await page.goto("/dashboard/purchase");
    const dialog = await openPaymentDialog(page, "Подтвердить предоплату");
    await uploadPaymentProof(dialog);
    await dialog.getByRole("button", { name: "Подтвердить предоплату", exact: true }).click();
    await expect(dialog.getByText("Причина отказа " + code, { exact: true })).toBeVisible();
    await expect.poll(() => tracker.customerOrdersRequestCount).toBeGreaterThan(readsAtPost);
    await expect(dialog.getByRole("button", { name: "Проверить результат" })).toHaveCount(0);
    await expect(dialog.getByText("Изображение загружено", { exact: true })).toHaveCount(code === "IMAGE_NOT_FOUND" ? 0 : 1);
    expect([tracker.uploads.length, posts]).toEqual([1, 1]);
  });
}

async function refreshPurchase(page: Page) {
  await page.clock.setFixedTime(new Date(await page.evaluate(() => Date.now()) + 180_000));
  await Promise.all([
    page.waitForResponse(r => r.request().method() === "GET" && new URL(r.url()).pathname === "/order/customer"),
    page.evaluate(() => {
      window.dispatchEvent(new Event("offline"));
      window.dispatchEvent(new Event("online"));
    }),
  ]);
}

const reviewReturn = (id: number, expectedVersion: number, imageId: number) => ({
  id, actor_id: 99, kind: "PAYMENT_RETURNED",
  payload: JSON.stringify({ request: { expectedVersion, reason: "Возврат " + imageId }, imageId, confirmedPaidAmount: "0.00" }),
});

test("после версии 1 устаревший GET не допускает upload и POST; версия 2 открывает следующий цикл", async ({ page, context, baseURL }) => {
  await authenticate(context, baseURL);
  const order = createPreorder({ orderId: 631, status: "AWAITING_PREPAYMENT", sellerId: 99 });
  const events: object[] = [];
  const tracker = await mockPaymentApi(page, { orders: [order], events, accounts: [], uploadImageId: 77 });
  const action = "Подтвердить предоплату";
  await page.goto("/dashboard/purchase");
  const first = await openPaymentDialog(page, action);
  await uploadPaymentProof(first);
  await first.getByRole("button", { name: action, exact: true }).click();
  const verified = page.getByRole("alert").filter({ hasText: "Заказ №631. Чек передан на проверку",
    hasNot: page.getByRole("button", { name: "Проверить результат" }) });
  await expect(verified.first()).toBeVisible();
  await expect(first).toBeHidden();
  Object.assign(order, { actualStatus: "AWAITING_PREPAYMENT", termsVersion: 0 });
  await refreshPurchase(page);
  const again = await openPaymentDialog(page, action);
  await expect(again.getByText(/Получена устаревшая версия заказа/)).toBeVisible();
  await expect(again.locator('input[type="file"]')).toBeDisabled();
  await again.locator("form").evaluate(f => (f as HTMLFormElement).requestSubmit());
  expect([tracker.uploads.length, tracker.statusImageIds.length]).toEqual([1, 1]);
  order.termsVersion = 2;
  events.push(reviewReturn(2, 1, 77));
  await again.getByRole("button", { name: "Обновить заказ" }).click();
  await expect(again.getByText("Причина возврата чека: Возврат 77")).toBeVisible();
  await again.getByRole("button", { name: "Чек соответствует новым условиям" }).click();
  await uploadPaymentProof(again);
  let uploads = 0;
  const posts: unknown[] = [];
  await page.route("**/images?tag=ORDER&entityId=631", route => {
    if (route.request().method() === "POST") uploads++;
    return fulfillJson(route, [78]);
  });
  await page.route("**/order/631/payments/prepayment", route => {
    if (route.request().method() === "POST") posts.push(route.request().postDataJSON());
    return fulfillJson(route, { code: "BAD_REQUEST", message: "Ручное предъявление" }, 400);
  });
  await again.getByRole("button", { name: action, exact: true }).click();
  await expect(again.getByText("Ручное предъявление")).toBeVisible();
  expect(uploads).toBe(1);
  expect(posts).toEqual([{ expectedVersion: 2, imageId: 78 }]);
});

test("возврат другого чека очищает файл и ID черновика только после актуальной истории", async ({ page, context, baseURL }) => {
  await authenticate(context, baseURL);
  const order = createPreorder({ orderId: 632, status: "AWAITING_PREPAYMENT", sellerId: 99 });
  const events: object[] = [];
  const tracker = await mockPaymentApi(page, { orders: [order], events, accounts: [], uploadImageId: 77, failFirstMutation: true });
  await page.goto("/dashboard/purchase");
  const dialog = await openPaymentDialog(page, "Подтвердить предоплату");
  const submit = dialog.getByRole("button", { name: "Подтвердить предоплату", exact: true });
  await uploadPaymentProof(dialog);
  await submit.click();
  await expect(submit).toBeEnabled();
  await expect(dialog.getByText("Изображение загружено")).toBeVisible();
  order.termsVersion = 2;
  await refreshPurchase(page);
  await dialog.getByRole("button", { name: "Чек соответствует новым условиям" }).click();
  await submit.click();
  await expect(dialog.getByText(/История не подтверждает актуальность чека/)).toBeVisible();
  events.push({ id: 20, actor_id: 1, kind: "PAYMENT_SUBMITTED", payload: '{"expectedVersion":0,"imageId":88}' }, reviewReturn(29, 1, 88));
  await refreshPurchase(page);
  await expect(dialog.getByText("Причина возврата чека: Возврат 88")).toBeVisible();
  await expect(dialog.getByText(/Изображение загружено|Файл выбран/)).toHaveCount(0);
  await expect(submit).toBeDisabled();
  expect([tracker.uploads.length, tracker.statusImageIds]).toEqual([1, [77]]);
});

for (const refreshOk of [true, false]) {
  test("401 TOKEN_INVALID_OR_EXPIRED после " + (refreshOk ? "успешного" : "неуспешного") + " refresh", async ({ page, context, baseURL }) => {
    await authenticate(context, baseURL);
    await context.addCookies([{ name: "refresh_token", value: "fixture-refresh", url: baseURL! },
      { name: "token_created_at", value: String(Date.now()), url: baseURL! }]);
    const order = createPreorder({ orderId: 633, status: "AWAITING_PREPAYMENT", sellerId: 99 });
    const tracker = await mockPaymentApi(page, { orders: [order], accounts: [], uploadImageId: 77 });
    let posts = 0, refreshes = 0, failedRead = true;
    await page.route("**/auth/refresh", route => {
      if (route.request().method() !== "OPTIONS") refreshes++;
      return route.fulfill({ status: route.request().method() === "OPTIONS" ? 204 : refreshOk ? 200 : 401,
        headers: { ...corsHeaders, "Access-Control-Allow-Headers": "*" }, contentType: "application/json",
        body: route.request().method() === "OPTIONS" ? "" : JSON.stringify(refreshOk ? "renewed" : { message: "Сессия истекла" }) });
    });
    await page.route("**/order/633/payments/prepayment", route => {
      if (route.request().method() === "POST") posts++;
      return fulfillJson(route, { code: "TOKEN_INVALID_OR_EXPIRED", message: "Истёк токен" }, 401);
    });
    await page.route("**/order/633/terms-history", route => posts && failedRead ? fulfillJson(route, {}, 503) : route.fallback());
    await page.goto("/dashboard/purchase");
    const action = "Подтвердить предоплату";
    const dialog = await openPaymentDialog(page, action);
    await uploadPaymentProof(dialog);
    await dialog.getByRole("button", { name: action, exact: true }).click();
    await expect.poll(() => refreshes).toBe(1);
    if (refreshOk) {
      const recheck = dialog.getByRole("button", { name: "Проверить результат" });
      await expect(recheck).toBeEnabled();
      failedRead = false;
      await recheck.click();
      await expect(dialog.getByRole("button", { name: action, exact: true })).toBeEnabled();
      expect(posts).toBe(1);
      await page.unroute("**/order/633/payments/prepayment");
      await dialog.getByRole("button", { name: action, exact: true }).click();
      await expect(dialog).toBeHidden();
      expect(tracker.statusImageIds).toEqual([77]);
    } else {
      await expect.poll(async () => (await context.cookies()).some(c => c.name === "access_token")).toBe(false);
      await expect(page).toHaveURL(/\/auth\/login/);
      await authenticate(context, baseURL);
      await page.goto("/dashboard/purchase");
      const next = await openPaymentDialog(page, action);
      await expect(next.getByRole("button", { name: action, exact: true })).toBeDisabled();
      await expect(next.getByText(/Изображение загружено|Проверить результат/)).toHaveCount(0);
    }
    expect([tracker.uploads.length, posts, refreshes]).toEqual([1, 1, 1]);
  });
}

for (const [status, code] of [[400, "UNKNOWN"], [409, "BAD_REQUEST"]] as const) {
  test("неподтверждённый отказ " + status + " " + code + " оставляет только GET", async ({ page, context, baseURL }) => {
    await authenticate(context, baseURL);
    const order = createPreorder({ orderId: 634, status: "AWAITING_PREPAYMENT", sellerId: 99 });
    const tracker = await mockPaymentApi(page, { orders: [order], accounts: [], uploadImageId: 77 });
    let posts = 0;
    await page.route("**/order/634/payments/prepayment", route => {
      if (route.request().method() === "POST") posts++;
      return fulfillJson(route, { code, message: "Отказ" }, status);
    });
    await page.goto("/dashboard/purchase");
    const dialog = await openPaymentDialog(page, "Подтвердить предоплату");
    await uploadPaymentProof(dialog);
    await dialog.getByRole("button", { name: "Подтвердить предоплату", exact: true }).click();
    const check = dialog.getByRole("button", { name: "Проверить результат" });
    await check.click();
    await expect(check).toBeEnabled();
    await expect(dialog.getByText(/Результат отправки чека неизвестен/)).toBeVisible();
    expect([tracker.uploads.length, posts]).toEqual([1, 1]);
  });
}

for (const accepted of [true, false]) {
  test("контрольный заказ с повреждённой версией сохраняет резерв после " + (accepted ? "HTTP 200" : "потери ответа"), async ({ page, context, baseURL }) => {
    await authenticate(context, baseURL);
    const order = createPreorder({ orderId: 635, status: "AWAITING_PREPAYMENT", sellerId: 99 });
    const events: object[] = [];
    const tracker = await mockPaymentApi(page, { orders: [order], events, accounts: [], uploadImageId: 77 });
    let posts = 0;
    await page.route("**/order/635/payments/prepayment", route => {
      if (route.request().method() !== "POST") return fulfillJson(route, {});
      posts++;
      Object.assign(order, { termsVersion: "2", actualStatus: "AWAITING_PREPAYMENT_APPROVAL", paymentProofImageId: 77 });
      events.push({ id: 10, kind: "PAYMENT_SUBMITTED", actor_id: 1, payload: '{"expectedVersion":0,"imageId":77}' });
      return accepted ? fulfillJson(route, 635) : route.abort("failed");
    });
    const action = "Подтвердить предоплату";
    await page.goto("/dashboard/purchase");
    const dialog = await openPaymentDialog(page, action);
    await uploadPaymentProof(dialog);
    await dialog.getByRole("button", { name: action, exact: true }).click();
    const check = page.getByRole("button", { name: "Проверить результат" }).first();
    await expect(check).toBeEnabled();
    for (const invalid of [2.5, null, undefined, -1, Number.MAX_SAFE_INTEGER + 1]) {
      Object.assign(order, { termsVersion: invalid });
      await Promise.all([page.waitForResponse(r => r.request().method() === "GET" && new URL(r.url()).pathname === "/order/customer"), check.click()]);
      await expect(check).toBeEnabled();
    }
    Object.assign(order, { termsVersion: 4, actualStatus: "AWAITING_PREPAYMENT" });
    await check.click();
    await expect(check).toBeEnabled();
    events.push(reviewReturn(11, 1, 77),
      { id: 19, kind: "PAYMENT_SUBMITTED", actor_id: 1, payload: '{"expectedVersion":2,"imageId":88}' }, reviewReturn(20, 3, 88));
    await check.click();
    await expect(check).toHaveCount(0);
    await expect(page.getByRole("alert").filter({ hasText: "Чек возвращён по истории заказа" }).first()).toBeVisible();
    expect([posts, tracker.uploads.length]).toEqual([1, 1]);
  });
}
