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

type NavigationCall = { method: "push" | "replace"; href: string };
type HistoryChange = { method: "pushState" | "replaceState" | "popstate"; href: string };
interface NavigationSnapshot {
  calls: NavigationCall[];
  history: HistoryChange[];
  rsc: string[];
  url: string;
  historyLength: number;
}

interface ObservedWindow extends Window {
  next?: { router: Record<"push" | "replace", (href: string, options?: { scroll?: boolean }) => void> };
  p01Navigation?: { calls: NavigationCall[]; history: HistoryChange[] };
}

async function observeNavigation(page: Page) {
  const rsc: string[] = [];
  page.on("request", request => {
    if (request.headers().rsc === "1" && !request.headers()["next-router-prefetch"]) {
      rsc.push(request.url());
    }
  });
  await page.evaluate(() => {
    const observed = window as ObservedWindow;
    const router = observed.next?.router;
    if (!router) throw new Error("The real Next app router is required for the navigation probe");
    const state = { calls: [] as NavigationCall[], history: [] as HistoryChange[] };
    observed.p01Navigation = state;
    // Делегируем настоящему router без изменения href, options или результата.
    // Вызов фиксируется до startTransition: XHR task не ждёт RSC/commit Next.
    for (const method of ["push", "replace"] as const) {
      const original = router[method];
      router[method] = function (href, options) {
        state.calls.push({ method, href: new URL(href, location.href).href });
        return original.call(this, href, options);
      };
    }
    for (const method of ["pushState", "replaceState"] as const) {
      const original = history[method];
      history[method] = function (...args: Parameters<typeof original>) {
        const before = location.href;
        const result = original.apply(this, args);
        if (location.href !== before) state.history.push({ method, href: location.href });
        return result;
      };
    }
    addEventListener("popstate", () => state.history.push({ method: "popstate", href: location.href }));
  });
  return async (): Promise<NavigationSnapshot> => ({
    ...await page.evaluate(() => {
      const state = (window as ObservedWindow).p01Navigation;
      if (!state) throw new Error("Navigation probe was lost (document navigation)");
      return { ...state, url: location.href, historyLength: history.length };
    }),
    rsc: [...rsc],
  });
}

function assertNoAuthNavigation(before: NavigationSnapshot, after: NavigationSnapshot) {
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    throw new Error(`Unexpected post-auth navigation: ${JSON.stringify({ before, after })}`);
  }
}

async function holdRsc(page: Page, pathname: string) {
  const gate = createDeferred();
  const started = createDeferred();
  const ready = createDeferred();
  const match = (url: URL) => url.pathname === pathname;
  const handler = async (route: Route) => {
    if (route.request().headers().rsc !== "1") return route.continue();
    started.resolve();
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    ready.resolve();
    await gate.promise;
    await route.fulfill({ response });
  };
  await page.route(match, handler);
  return {
    started: started.promise,
    ready: ready.promise,
    release: gate.resolve,
    dispose: async () => { gate.resolve(); await page.unroute(match, handler); },
  };
}

async function observeAuthSettlement(page: Page, path: string) {
  await page.addInitScript(path => {
    const observed = window as typeof window & { lateAuthSettled?: boolean };
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method: string, url: string | URL, async: boolean = true, username?: string | null, password?: string | null) {
      const request = this;
      if (new URL(String(url), location.href).pathname === path) {
        request.addEventListener("loadend", () => {
          if (request.status !== 200) return;
          const channel = new MessageChannel();
          channel.port1.onmessage = () => {
            observed.lateAuthSettled = true;
            channel.port1.close();
            channel.port2.close();
          };
          channel.port2.postMessage(null);
        }, { once: true });
      }
      return originalOpen.call(this, method, url, async, username, password);
    };
  }, path);
}

// Положительный контроль навигационного oracle отдельно от token assertions.
// Настоящий успешный login начинает replace, пока RSC удерживает старый URL/UI.
test("navigation probe detects a pending post-auth replace with unchanged session cookies", async ({ page, context }) => {
  await mockApiFallback(page);
  await mockLogin(page, { accessToken: "probe-access", refreshToken: "probe-refresh" });
  await observeAuthSettlement(page, "/auth/login");
  const about = await holdRsc(page, "/about");
  try {
    await page.goto("/auth/login?redirect=%2Fabout", { waitUntil: "domcontentloaded" });
    const submit = page.getByRole("button", { name: "Войти", exact: true });
    await waitForReactHydration(submit);
    const snapshot = await observeNavigation(page);
    const before = await snapshot();
    await page.getByLabel(/^Email/).fill("probe@example.test");
    await page.getByLabel(/^Пароль/).fill("fixture-password");
    await submit.click();
    await about.started;
    await about.ready;
    await expect.poll(() => page.evaluate(() => (window as typeof window & { lateAuthSettled?: boolean }).lateAuthSettled)).toBe(true);
    await expect(page).toHaveURL(before.url);
    await expect(page.getByRole("heading", { name: "Вход в аккаунт", exact: true })).toBeVisible();
    const pending = await snapshot();
    expect(pending.calls.slice(before.calls.length)).toEqual([{ method: "replace", href: new URL("/about", page.url()).href }]);
    expect(pending.rsc.slice(before.rsc.length).map(url => new URL(url).pathname)).toEqual(["/about"]);
    expect(pending.history).toEqual(before.history);
    const cookies = await getSessionCookies(context);
    const user = await page.evaluate(() => localStorage.getItem("auth-storage"));
    expect(() => assertNoAuthNavigation(before, pending)).toThrow("Unexpected post-auth navigation");
    // Независимый канал истории также обнаруживает завершение перехода,
    // даже если из snapshot исключить уже обнаруженные calls и RSC.
    about.release();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByRole("heading", { name: "О нас", exact: true })).toBeVisible();
    const committed = await snapshot();
    expect(committed.history.slice(before.history.length)).toEqual([{ method: "replaceState", href: page.url() }]);
    expect(() => assertNoAuthNavigation(before, { ...committed, calls: before.calls, rsc: before.rsc, url: before.url })).toThrow("Unexpected post-auth navigation");
    expect(await getSessionCookies(context)).toEqual(cookies);
    expect(await page.evaluate(() => localStorage.getItem("auth-storage"))).toBe(user);
  } finally {
    await about.dispose();
  }
});

// P01: docs/api-and-auth.md и FTA-034 требуют, чтобы поздний auth старого
// поколения не возвращал пользователя и не выполнял его post-auth redirect.
for (const flow of ["login", "login verification", "registration verification"] as const) {
  for (const replacement of ["logout", "new login", "pending new login"] as const) {
    test(`late ${flow} after ${replacement} preserves the current owner and navigation`, async ({ page, context, baseURL }) => {
      const gate = createDeferred();
      const started = createDeferred();
      const nextGate = createDeferred();
      const nextStarted = createDeferred();
      const hasNewLogin = replacement !== "logout";
      const isRegistration = flow === "registration verification";
      const endpoint = flow === "login" ? "/auth/login" : "/auth/verify-code";
      const authPayloads: unknown[] = [];
      const protectedRequests: ProtectedRequest[] = [];
      let documentRequests = 0;
      page.on("request", request => {
        if (request.resourceType() === "document") documentRequests++;
      });
      // Наблюдаем завершение XHR и следующий task после его promise callbacks.
      // Store, router и auth API приложения не подменяются.
      await observeAuthSettlement(page, endpoint);
      const about = await holdRsc(page, "/about");
      if (flow !== "login verification") {
        await setSessionCookies(context, baseURL, { accessToken: "access-A", refreshToken: "refresh-A" });
      }
      await mockApiFallback(page);
      await page.route("http://127.0.0.1:9/participant", async route => {
        if (route.request().method() === "OPTIONS") return fulfillPreflight(route);
        if (route.request().method() === "POST") {
          expect(isRegistration).toBe(true);
          expect(route.request().postDataJSON()).toEqual({ mail: "late-A@example.test", password: "fixture-password", age: 25 });
          return fulfillJson(route, 101);
        }
        const authorization = route.request().headers().authorization;
        protectedRequests.push({ path: "/participant", authorization });
        const owner = authorization === "Bearer access-B" ? "B" : "A";
        await fulfillJson(route, {
          id: owner === "B" ? 2 : 1, login: `account-${owner}`, mail: `${owner}@example.test`,
          fullName: `Account ${owner}`, role: "USER", phoneNumber: "", status: "ACTIVE",
          sellerStatus: "DEFAULT", imageId: null, image: [], addresses: [], accounts: [], transfers: [], socialNetworks: [],
        });
      });
      await page.route("http://127.0.0.1:9/auth/verification/resend?*", async route => {
        if (route.request().method() === "OPTIONS") return fulfillPreflight(route);
        expect(new URL(route.request().url()).searchParams.get("email")).toBe("late-A@example.test");
        await fulfillJson(route, 101);
      });
      await page.route("http://127.0.0.1:9/auth/login", async route => {
        if (route.request().method() === "OPTIONS") return fulfillPreflight(route);
        const payload = route.request().postDataJSON();
        authPayloads.push(payload);
        if (payload.mail === "B@example.test" || payload.mail === "A@example.test") {
          const owner = payload.mail === "B@example.test" ? "B" : "A";
          if (owner === "B") { nextStarted.resolve(); await nextGate.promise; }
          return fulfillJson(route, { access_token: `access-${owner}`, refresh_token: `refresh-${owner}` });
        }
        expect(payload).toEqual({ mail: "late-A@example.test", password: "fixture-password" });
        if (flow === "login verification") {
          return fulfillJson(route, { code: "WAITING_VERIFY", next: "VERIFY_EMAIL" }, 403);
        }
        started.resolve();
        await gate.promise;
        await fulfillJson(route, { access_token: "access-late-A", refresh_token: "refresh-late-A" });
      });
      await page.route("http://127.0.0.1:9/auth/verify-code", async route => {
        if (route.request().method() === "OPTIONS") return fulfillPreflight(route);
        expect(route.request().postDataJSON()).toEqual({ userId: 101, code: "12345" });
        started.resolve();
        await gate.promise;
        await fulfillJson(route, { access_token: "access-late-A", refresh_token: "refresh-late-A" });
      });
      try {
        const authPath = `/auth/${isRegistration ? "register" : "login"}?redirect=%2Fabout`;
        await page.goto(authPath, { waitUntil: "domcontentloaded" });
        const submit = page.getByRole("button", { name: isRegistration ? "Зарегистрироваться" : "Войти", exact: true });
        await waitForReactHydration(submit);
        const snapshot = await observeNavigation(page);
        // Forward позволяет уйти даже из busy verification dialog через браузер.
        // Вся цепочка остаётся в одном документе и сохраняет выполняющийся callback.
        await page.getByRole("link", { name: "Figurzilla", exact: true }).click();
        await expect(page).toHaveURL(requireBaseUrl(baseURL) + "/");
        await page.goBack();
        await expect(page).toHaveURL(requireBaseUrl(baseURL) + authPath);
        await page.getByLabel(/^Email/).fill("late-A@example.test");
        await page.getByLabel(/^Пароль/).fill("fixture-password");
        if (isRegistration) await page.getByLabel(/^Возраст/).fill("25");
        await submit.click();
        if (flow !== "login") {
          const dialog = page.getByRole("dialog");
          for (let digit = 1; digit <= 5; digit++) {
            await dialog.getByRole("textbox", { name: `Цифра ${digit} из 5` }).fill(String(digit));
          }
          await dialog.getByRole("button", { name: "Подтвердить", exact: true }).click();
        }
        await started.promise;
        await page.goForward();
        await expect(page).toHaveURL(requireBaseUrl(baseURL) + "/");
        if (flow === "login verification") {
          // Подтверждение почты начато гостем. Входим в аккаунт через UI,
          // чтобы выполнить реальный logout, пока старый verify остаётся в полёте.
          await page.getByRole("link", { name: "Профиль", exact: true }).click();
          await expect(page).toHaveURL(/\/auth\/login$/);
          await page.getByLabel(/^Email/).fill("A@example.test");
          await page.getByLabel(/^Пароль/).fill("fixture-password");
          await page.getByRole("button", { name: "Войти", exact: true }).click();
          await expect(page).toHaveURL(requireBaseUrl(baseURL) + "/");
        }
        await page.getByRole("link", { name: "Профиль", exact: true }).click();
        await expect(page.getByText("account-A", { exact: true }).first()).toBeVisible();
        await page.getByRole("button", { name: "Выход", exact: true }).click();
        await expect(page).toHaveURL(/\/auth\/login(?:\?|$)/);
        expect(await getSessionCookies(context)).toEqual({});
        // RequireAuth сохраняет return path кабинета. Через гостевую ссылку
        // открываем отдельный auth intent без redirect, сохраняя тот же документ.
        await page.getByRole("link", { name: "Figurzilla", exact: true }).click();
        await expect(page).toHaveURL(requireBaseUrl(baseURL) + "/");
        await page.getByRole("link", { name: "Профиль", exact: true }).click();
        await expect(page).toHaveURL(/\/auth\/login$/);
        if (hasNewLogin) {
          await page.getByLabel(/^Email/).fill("B@example.test");
          await page.getByLabel(/^Пароль/).fill("fixture-password");
          await page.getByRole("button", { name: "Войти", exact: true }).click();
          await nextStarted.promise;
          if (replacement === "new login") {
            nextGate.resolve();
            await expect(page).toHaveURL(requireBaseUrl(baseURL) + "/");
            await page.getByRole("link", { name: "Профиль", exact: true }).click();
            await expect(page.getByText("account-B", { exact: true }).first()).toBeVisible();
          } else {
            await expect(page.locator('form button[type="submit"]')).toBeDisabled();
          }
        }
        const currentUrl = page.url();
        const cookies = await getSessionCookies(context);
        const user = await page.evaluate(() => localStorage.getItem("auth-storage"));
        const reads = protectedRequests.length;
        const navigation = await snapshot();
        await page.evaluate(() => { (window as typeof window & { lateAuthSettled?: boolean }).lateAuthSettled = false; });
        const finished = page.waitForEvent("requestfinished", request => new URL(request.url()).pathname === endpoint && request.method() === "POST");
        gate.resolve();
        await finished;
        await expect.poll(() => page.evaluate(() => (window as typeof window & { lateAuthSettled?: boolean }).lateAuthSettled)).toBe(true);
        assertNoAuthNavigation(navigation, await snapshot());
        await expect(page).toHaveURL(currentUrl);
        expect(await getSessionCookies(context)).toEqual(cookies);
        expect(await page.evaluate(() => localStorage.getItem("auth-storage"))).toBe(user);
        expect(documentRequests).toBe(1);
        expect(protectedRequests).toHaveLength(reads);
        expect(authPayloads).toEqual([
          ...(isRegistration ? [] : [{ mail: "late-A@example.test", password: "fixture-password" }]),
          ...(flow === "login verification" ? [{ mail: "A@example.test", password: "fixture-password" }] : []),
          ...(hasNewLogin ? [{ mail: "B@example.test", password: "fixture-password" }] : []),
        ]);
        if (replacement === "pending new login") {
          expect(cookies).toEqual({});
          expect(JSON.parse(user!).state.user).toBeNull();
          await expect(page.getByRole("heading", { name: "Вход в аккаунт", exact: true })).toBeVisible();
          await expect(page.getByLabel(/^Email/)).toHaveValue("B@example.test");
          await expect(page.locator('form button[type="submit"]')).toBeDisabled();
          nextGate.resolve();
          await expect(page).toHaveURL(requireBaseUrl(baseURL) + "/");
          const ownNavigation = await snapshot();
          expect(ownNavigation.calls.slice(navigation.calls.length)).toEqual([{ method: "replace", href: page.url() }]);
          expect(ownNavigation.history.slice(navigation.history.length)).toEqual([{ method: "replaceState", href: page.url() }]);
          expect(ownNavigation.historyLength).toBe(navigation.historyLength);
          expect(ownNavigation.rsc.slice(navigation.rsc.length).some(url => new URL(url).pathname === "/about")).toBe(false);
          await page.getByRole("link", { name: "Профиль", exact: true }).click();
          await expect(page.getByText("account-B", { exact: true }).first()).toBeVisible();
        }
        if (hasNewLogin) {
          const currentCookies = await getSessionCookies(context);
          expect(currentCookies.access_token).toBe("access-B");
          expect(currentCookies.refresh_token).toBe("refresh-B");
          const currentUser = await page.evaluate(() => localStorage.getItem("auth-storage"));
          expect(JSON.parse(currentUser!).state.user).toEqual({ mail: "B@example.test" });
          await expect(page.getByText("account-B", { exact: true }).first()).toBeVisible();
          await expect(page.getByText("account-A", { exact: true })).toHaveCount(0);
          expect(protectedRequests.at(-1)?.authorization).toBe("Bearer access-B");
        } else {
          expect(cookies).toEqual({});
          expect(JSON.parse(user!).state.user).toBeNull();
          await expect(page.getByRole("heading", { name: "Вход в аккаунт", exact: true })).toBeVisible();
          await expect(page.getByRole("link", { name: "Профиль", exact: true })).toHaveAttribute("href", "/auth/login");
        }
      } finally {
        gate.resolve();
        nextGate.resolve();
        await about.dispose();
      }
    });
  }
}
