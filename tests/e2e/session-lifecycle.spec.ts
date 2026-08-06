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
  "Access-Control-Allow-Headers":
    "authorization, content-type, x-refresh-token",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const SESSION_COOKIE_NAMES = [
  "access_token",
  "refresh_token",
  "token_created_at",
] as const;

interface SessionCookies {
  accessToken?: string;
  refreshToken?: string;
}

interface ProtectedRequest {
  authorization: string | undefined;
  path: string;
}

interface ProtectedApiController {
  requests: ProtectedRequest[];
  attempts(path: string): number;
  authorizations(path: string): Array<string | undefined>;
}

const requireBaseUrl = (baseURL: string | undefined): string => {
  if (!baseURL) {
    throw new Error("Playwright baseURL is required for session tests");
  }

  return baseURL;
};

const setSessionCookies = async (
  context: BrowserContext,
  baseURL: string | undefined,
  { accessToken, refreshToken }: SessionCookies,
) => {
  const url = requireBaseUrl(baseURL);
  const cookies = [
    ...(accessToken
      ? [
          {
            name: "access_token",
            value: accessToken,
            url,
          },
          {
            name: "token_created_at",
            value: Date.now().toString(),
            url,
          },
        ]
      : []),
    ...(refreshToken
      ? [
          {
            name: "refresh_token",
            value: refreshToken,
            url,
          },
        ]
      : []),
  ];

  await context.addCookies(cookies);
};

const getSessionCookies = async (context: BrowserContext) => {
  const cookies = await context.cookies();

  return Object.fromEntries(
    cookies
      .filter(({ name }) =>
        SESSION_COOKIE_NAMES.includes(
          name as (typeof SESSION_COOKIE_NAMES)[number],
        ),
      )
      .map(({ name, value }) => [name, value]),
  );
};

const fulfillJson = async (
  route: Route,
  body: unknown,
  status: number = 200,
) => {
  await route.fulfill({
    status,
    headers: corsHeaders,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
};

const fulfillPreflight = async (route: Route) => {
  await route.fulfill({
    status: 204,
    headers: corsHeaders,
  });
};

const getSuccessfulBody = (path: string): unknown => {
  if (path === "/auth/profile") {
    return {
      id: 1,
      fullName: "Тестовый пользователь",
      login: "session-test-user",
      role: "USER",
      email: "user@example.com",
      imageId: null,
      image: [],
      exp: 0,
      type: "access",
    };
  }

  return [];
};

const mockApiFallback = async (page: Page) => {
  await page.route("http://127.0.0.1:9/**", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await fulfillPreflight(route);
      return;
    }

    const path = new URL(route.request().url()).pathname;
    await fulfillJson(route, getSuccessfulBody(path));
  });
};

const mockProtectedApi = async (
  page: Page,
  paths: string[],
  respond: (
    request: ProtectedRequest,
  ) =>
    | { body?: unknown; status?: number }
    | Promise<{ body?: unknown; status?: number }>,
): Promise<ProtectedApiController> => {
  const requests: ProtectedRequest[] = [];

  const handleRoute = async (route: Route) => {
    if (route.request().method() === "OPTIONS") {
      await fulfillPreflight(route);
      return;
    }

    const path = new URL(route.request().url()).pathname;
    const request = {
      authorization: route.request().headers()["authorization"],
      path,
    };
    requests.push(request);

    const response = await respond(request);
    await fulfillJson(
      route,
      response.body ?? getSuccessfulBody(path),
      response.status ?? 200,
    );
  };

  for (const path of paths) {
    await page.route(`**${path}`, handleRoute);
  }

  return {
    requests,
    attempts: (path) =>
      requests.filter((request) => request.path === path).length,
    authorizations: (path) =>
      requests
        .filter((request) => request.path === path)
        .map((request) => request.authorization),
  };
};

const mockRefresh = async (
  page: Page,
  {
    accessToken = "fresh-access-token",
    status = 200,
    waitFor,
  }: {
    accessToken?: string;
    status?: number;
    waitFor?: Promise<void>;
  } = {},
) => {
  const state = {
    count: 0,
    refreshHeaders: [] as Array<string | undefined>,
  };

  await page.route("**/auth/refresh", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await fulfillPreflight(route);
      return;
    }

    state.count += 1;
    state.refreshHeaders.push(
      route.request().headers()["x-refresh-token"],
    );

    await waitFor;

    if (status >= 400) {
      await fulfillJson(
        route,
        {
          code: "TOKEN_INVALID_OR_EXPIRED",
          message: "Refresh failed",
          status,
        },
        status,
      );
      return;
    }

    await fulfillJson(route, accessToken);
  });

  return state;
};

const mockLogin = async (
  page: Page,
  {
    accessToken,
    refreshToken,
  }: {
    accessToken: string;
    refreshToken: string;
  },
) => {
  const state = {
    count: 0,
    payloads: [] as unknown[],
  };

  await page.route("**/auth/login", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await fulfillPreflight(route);
      return;
    }

    state.count += 1;
    state.payloads.push(route.request().postDataJSON());

    await fulfillJson(route, {
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  });

  return state;
};

const createDeferred = () => {
  let resolvePromise!: () => void;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: resolvePromise,
  };
};

const waitForReactHydration = async (locator: Locator) => {
  await locator.waitFor({ state: "visible" });
  await expect
    .poll(
      () =>
        locator.evaluate((element) =>
          Object.keys(element).some((key) =>
            key.startsWith("__reactProps$"),
          ),
        ),
      { timeout: 15_000 },
    )
    .toBe(true);
};

const unauthorizedResponse = {
  status: 401,
  body: {
    code: "TOKEN_INVALID_OR_EXPIRED",
    message: "Access token expired",
    status: 401,
  },
};

test.describe("session lifecycle", () => {
  test("login stores session cookies and follows the requested redirect", async ({
    page,
    context,
  }) => {
    await mockApiFallback(page);
    const login = await mockLogin(page, {
      accessToken: "login-access-token",
      refreshToken: "login-refresh-token",
    });

    await page.goto("/auth/login?redirect=%2Fabout", {
      waitUntil: "domcontentloaded",
    });
    const submitButton = page.getByRole("button", {
      name: "Войти",
      exact: true,
    });
    await waitForReactHydration(submitButton);
    await page.getByLabel(/^Email/).fill("user@example.com");
    await page.getByLabel(/^Пароль/).fill("password");
    await submitButton.click();

    await expect(page).toHaveURL(/\/about$/, { timeout: 15_000 });
    expect(login.count).toBe(1);
    expect(login.payloads).toEqual([
      {
        mail: "user@example.com",
        password: "password",
      },
    ]);

    const cookies = await getSessionCookies(context);
    expect(cookies.access_token).toBe("login-access-token");
    expect(cookies.refresh_token).toBe("login-refresh-token");
    expect(Number(cookies.token_created_at)).toBeGreaterThan(0);
  });

  test("logout clears session cookies and redirects to login", async ({
    page,
    context,
    baseURL,
  }) => {
    await setSessionCookies(context, baseURL, {
      accessToken: "logout-access-token",
      refreshToken: "logout-refresh-token",
    });
    await mockApiFallback(page);

    await page.goto("/dashboard/security", {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByRole("heading", { name: "Безопасность" }),
    ).toBeVisible();

    const logoutButton = page.getByRole("button", {
      name: "Выход",
      exact: true,
    });
    await waitForReactHydration(logoutButton);
    await logoutButton.click();

    await expect(page).toHaveURL(/\/auth\/login(?:\?|$)/, {
      timeout: 15_000,
    });

    const cookies = await getSessionCookies(context);
    expect(cookies.access_token).toBeUndefined();
    expect(cookies.refresh_token).toBeUndefined();
    expect(cookies.token_created_at).toBeUndefined();
  });

  test("refresh-only session initializes once and stores a fresh access token", async ({
    page,
    context,
    baseURL,
  }) => {
    await setSessionCookies(context, baseURL, {
      refreshToken: "refresh-only-token",
    });
    await mockApiFallback(page);
    const refresh = await mockRefresh(page, {
      accessToken: "initialized-access-token",
    });

    await page.goto("/about", {
      waitUntil: "domcontentloaded",
    });

    await expect.poll(() => refresh.count).toBe(1);
    expect(refresh.refreshHeaders).toEqual(["refresh-only-token"]);

    const cookies = await getSessionCookies(context);
    expect(cookies.access_token).toBe("initialized-access-token");
    expect(cookies.refresh_token).toBe("refresh-only-token");
    expect(Number(cookies.token_created_at)).toBeGreaterThan(0);
  });

  test("concurrent 401 responses share one refresh and retry with the fresh token", async ({
    page,
    context,
    baseURL,
  }) => {
    const refreshGate = createDeferred();
    const protectedPaths = ["/basket/find", "/auth/profile", "/address"];

    await setSessionCookies(context, baseURL, {
      accessToken: "expired-access-token",
      refreshToken: "concurrent-refresh-token",
    });
    await mockApiFallback(page);
    const protectedApi = await mockProtectedApi(
      page,
      protectedPaths,
      ({ authorization }) =>
        authorization === "Bearer expired-access-token"
          ? unauthorizedResponse
          : {},
    );
    const refresh = await mockRefresh(page, {
      accessToken: "concurrent-fresh-access-token",
      waitFor: refreshGate.promise,
    });

    try {
      await page.goto("/checkout", {
        waitUntil: "domcontentloaded",
      });

      await expect
        .poll(
          () =>
            protectedApi.requests.filter(
              ({ authorization }) =>
                authorization === "Bearer expired-access-token",
            ).length,
        )
        .toBeGreaterThanOrEqual(2);
      await expect.poll(() => refresh.count).toBe(1);

      refreshGate.resolve();

      await expect
        .poll(
          () =>
            protectedApi.requests.filter(
              ({ authorization }) =>
                authorization === "Bearer concurrent-fresh-access-token",
            ).length,
        )
        .toBeGreaterThanOrEqual(2);
    } finally {
      refreshGate.resolve();
    }

    expect(refresh.count).toBe(1);
    expect(refresh.refreshHeaders).toEqual(["concurrent-refresh-token"]);

    const cookies = await getSessionCookies(context);
    expect(cookies.access_token).toBe(
      "concurrent-fresh-access-token",
    );
    await expect(page).toHaveURL(/\/checkout$/);
  });

  test("refresh failure clears the session and performs a document redirect", async ({
    page,
    context,
    baseURL,
  }) => {
    let loginDocumentRequests = 0;

    page.on("request", (request) => {
      const url = new URL(request.url());
      if (
        request.resourceType() === "document" &&
        url.pathname === "/auth/login"
      ) {
        loginDocumentRequests += 1;
      }
    });

    await setSessionCookies(context, baseURL, {
      accessToken: "failed-refresh-access-token",
      refreshToken: "failed-refresh-token",
    });
    await mockApiFallback(page);
    const protectedApi = await mockProtectedApi(
      page,
      ["/address"],
      () => unauthorizedResponse,
    );
    const refresh = await mockRefresh(page, { status: 401 });

    await page.goto("/checkout", {
      waitUntil: "commit",
    });

    await expect(page).toHaveURL(/\/auth\/login(?:\?|$)/);
    await expect.poll(() => loginDocumentRequests).toBe(1);
    expect(refresh.count).toBe(1);
    expect(protectedApi.attempts("/address")).toBe(1);

    const cookies = await getSessionCookies(context);
    expect(cookies.access_token).toBeUndefined();
    expect(cookies.refresh_token).toBeUndefined();
    expect(cookies.token_created_at).toBeUndefined();
  });

  test("a request that remains unauthorized is retried only once", async ({
    page,
    context,
    baseURL,
  }) => {
    await setSessionCookies(context, baseURL, {
      accessToken: "retry-once-expired-token",
      refreshToken: "retry-once-refresh-token",
    });
    await mockApiFallback(page);
    const protectedApi = await mockProtectedApi(
      page,
      ["/address"],
      () => unauthorizedResponse,
    );
    const refresh = await mockRefresh(page, {
      accessToken: "retry-once-fresh-token",
    });

    await page.goto("/checkout", {
      waitUntil: "domcontentloaded",
    });

    await expect
      .poll(() => protectedApi.attempts("/address"))
      .toBe(2);
    expect(refresh.count).toBe(1);
    expect(protectedApi.authorizations("/address")).toEqual([
      "Bearer retry-once-expired-token",
      "Bearer retry-once-fresh-token",
    ]);
    await expect(page).toHaveURL(/\/checkout$/);
  });
});
