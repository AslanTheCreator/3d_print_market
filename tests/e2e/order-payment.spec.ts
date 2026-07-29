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
  orders: unknown[];
  accounts: unknown[];
  accountsStatus?: number;
  uploadImageId: number;
  failFirstMutation?: boolean;
  mutationFailure?: "http-409" | "network";
  customerOrdersRefetchGate?: Promise<void>;
}

interface PaymentApiTracker {
  accountsRequestCount: number;
  customerOrdersRequestCount: number;
  deletedImageIds: number[];
  statusComments: string[];
  statusHasAccountId: boolean[];
  statusImageIds: number[];
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
}: {
  orderId: number;
  status: PaymentStatus;
  sellerId: number;
  quantity?: number;
}) => ({
  orderId,
  actualStatus: status,
  totalPrice: 30_000,
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
    availability: "PREORDER",
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
    accounts,
    accountsStatus = 200,
    uploadImageId,
    failFirstMutation = false,
    mutationFailure,
    customerOrdersRefetchGate,
  }: PaymentApiOptions,
): Promise<PaymentApiTracker> => {
  const tracker: PaymentApiTracker = {
    accountsRequestCount: 0,
    customerOrdersRequestCount: 0,
    deletedImageIds: [],
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
    tracker.customerOrdersRequestCount += 1;

    if (
      shouldWaitForCustomerReconciliation &&
      customerOrdersRefetchGate
    ) {
      await customerOrdersRefetchGate;
    }

    await fulfillJson(route, orders);
  });
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
      await fulfillJson(route, {});
      return;
    }

    await fulfillJson(route, []);
  });

  await page.route(
    /\/order\/\d+\/(?:AWAITING_PREPAYMENT_APPROVAL|ASSEMBLING)(?:\?.*)?$/,
    async (route) => {
      if (route.request().method() === "OPTIONS") {
        await fulfillJson(route, {});
        return;
      }

      const url = new URL(route.request().url());
      tracker.statusComments.push(url.searchParams.get("comment") ?? "");
      tracker.statusHasAccountId.push(url.searchParams.has("accountId"));
      tracker.statusImageIds.push(
        Number(url.searchParams.get("imageId") ?? Number.NaN),
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
            code: "ORDER_STATUS_CONFLICT",
            message: "Статус заказа изменился, повторите попытку",
            status: 409,
          },
          409,
        );
        return;
      }

      await fulfillJson(route, 1);
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
    dialog.getByText("Изображение загружено", { exact: true }),
  ).toBeVisible();
};

test.describe("order payment flow", () => {
  test("shows quantity-aware preorder amounts, auto-selects one account and deletes an unlinked upload", async ({
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
    await expect(prepaymentDialog.getByText(/К предоплате:/)).toContainText(
      /7[\s\u00a0]500[\s\u00a0]*₽/,
    );
    await expect(
      prepaymentDialog.getByText(/^Остаток после предоплаты:/),
    ).toContainText(/30[\s\u00a0]000[\s\u00a0]*₽/);
    await expect(
      prepaymentDialog.getByText(/^Стоимость товаров:/),
    ).toContainText(/37[\s\u00a0]500[\s\u00a0]*₽/);
    await expect(
      prepaymentDialog.getByText("TEST-ACCOUNT-501", { exact: true }),
    ).toBeVisible();

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
    await expect.poll(() => tracker.deletedImageIds).toEqual([9_101]);
    expect(tracker.statusImageIds).toEqual([]);

    const paymentDialog = await openPaymentDialog(
      page,
      "Подтвердить оплату",
    );
    await expect(
      paymentDialog.getByText(/Остаток к оплате:/),
    ).toContainText(/30[\s\u00a0]000[\s\u00a0]*₽/);
    await expect(paymentDialog.getByText(/^Предоплата:/)).toContainText(
      /7[\s\u00a0]500[\s\u00a0]*₽/,
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
        status: "AWAITING_PREPAYMENT",
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
        "Подтвердить предоплату",
      );
      await uploadPaymentProof(dialog);

      await expect(dialog.getByText(scenario.expectedMessage)).toBeVisible({
        timeout: 15_000,
      });
      const confirmButton = dialog.getByRole("button", {
        name: "Подтвердить предоплату",
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
      await expect.poll(() => tracker.deletedImageIds).toEqual([
        scenario.orderId + 9_000,
      ]);
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
          status: "AWAITING_PREPAYMENT",
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
      "Подтвердить предоплату",
    );
    await uploadPaymentProof(dialog);

    const confirmButton = dialog.getByRole("button", {
      name: "Подтвердить предоплату",
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
    await expect.poll(() => tracker.deletedImageIds).toEqual([9_201]);
    expect(tracker.statusImageIds).toEqual([]);
  });

  test("deletes an orphan upload when the customer closes after HTTP 409", async ({
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
    await expect.poll(() => tracker.deletedImageIds).toEqual([9_300]);
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
    const sellerId = 97;
    const tracker = await mockPaymentApi(page, {
      orders: [
        createPreorder({
          orderId: 529,
          status: "AWAITING_PREPAYMENT",
          sellerId,
        }),
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
      customerOrdersRefetchGate,
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

    await expect(
      dialog.getByText("Нет соединения с сервером", { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", {
        name: "Подтвердить предоплату",
        exact: true,
      }),
    ).toBeEnabled();
    await expect(dialog.locator('input[type="file"]')).toBeDisabled();

    await dialog
      .getByRole("button", { name: "Отмена", exact: true })
      .click();
    await expect(dialog).toBeHidden();
    expect(tracker.deletedImageIds).toEqual([]);
  });

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

    const comment = "Тестовый комментарий для повторной попытки";
    const commentInput = dialog.getByLabel("Комментарий (необязательно)");
    await commentInput.fill(comment);

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
    await expect(commentInput).toHaveValue(comment);
    await expect(
      dialog.getByText("Изображение загружено", { exact: true }),
    ).toBeVisible();
    await expect(confirmButton).toBeEnabled();

    await confirmButton.click();
    await expect(dialog).toBeHidden();

    expect(tracker.statusImageIds).toEqual([9_301, 9_301]);
    expect(tracker.statusComments).toEqual([comment, comment]);
    expect(tracker.statusHasAccountId).toEqual([false, false]);
    expect(tracker.deletedImageIds).toEqual([]);
  });
});
