import { expect, test } from "@playwright/test";
import axios, { AxiosError, AxiosHeaders, type AxiosAdapter, type AxiosInstance } from "axios";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { authApi, useAuthStore } from "@/entities/session";
import { tokenStorage } from "@/shared/lib";
import { parseRuntimeApiUrl } from "@/shared/config/env";
import * as errorHandler from "@/shared/lib/errorHandler";

const { ApiError, serializeApiError, transformToApiError, logApiError } = errorHandler;
const secrets = [
  "SYNTHETIC_BEARER_SECRET",
  "SYNTHETIC_REFRESH_SECRET",
  "SYNTHETIC_PASSWORD_SECRET",
  "SYNTHETIC_DETAILS_SECRET",
  "SYNTHETIC_MESSAGE_SECRET",
  "SYNTHETIC_COOKIE_SECRET",
];
const requestUrl =
  `https://user:${secrets[2]}@fixture.invalid/participant/password?oldPassword=${secrets[2]}#${secrets[1]}`;

const makeError = (status = 400) => {
  const config = {
    url: requestUrl,
    headers: new AxiosHeaders({
      Authorization: `Bearer ${secrets[0]}`,
      "X-Refresh-Token": secrets[1],
      Cookie: secrets[5],
    }),
    data: { password: secrets[2] },
    params: { oldPassword: secrets[2], refreshToken: secrets[1] },
  };
  const data = {
    code: "COUNT_INVALID",
    status,
    message: secrets[4],
    details: { nested: [{ password: secrets[2], secret: secrets[3] }] },
    timestamp: secrets[3],
  };
  return new AxiosError(
    secrets[4],
    "ERR_BAD_REQUEST",
    config,
    { secret: secrets[0] },
    { status, statusText: secrets[4], data, headers: {}, config },
  );
};

const methods = ["log", "error", "warn", "info", "group", "groupEnd"] as const;
const consoleMethods: ReadonlySet<string> = new Set(methods);
const captureConsole = () => {
  const calls: unknown[][] = [];
  const original = methods.map((method) => console[method]);
  for (const method of methods) console[method] = (...args: unknown[]) => { calls.push(args); };
  return {
    calls,
    restore: () => {
      methods.forEach((method, index) => { console[method] = original[index]; });
    },
  };
};

const expectSafe = (calls: unknown[][]) => {
  const output = JSON.stringify(calls);
  for (const secret of secrets) expect(output).not.toContain(secret);
  expect(output).not.toMatch(/Authorization|X-Refresh-Token|oldPassword|originalError/);
};

// Isolated instances execute the real interceptors/manager with mock transport and timers.
const loadModule = <T>(
  file: string,
  mocks: Record<string, unknown>,
  globals: Record<string, unknown> = {},
): T => {
  const module = { exports: {} };
  const output = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(output, {
    module,
    exports: module.exports,
    require: (name: string) => {
      if (!(name in mocks)) throw new Error(`Missing mock for ${name}`);
      return mocks[name];
    },
    console, process, URL, AbortController, setTimeout, clearTimeout,
    ...globals,
  }, { filename: file });
  return module.exports as T;
};

const consoleSinks = (directory: string): Array<{ file: string; expression: string }> =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return consoleSinks(file);
    if (!/\.tsx?$/.test(file)) return [];
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    const sinks: Array<{ file: string; expression: string }> = [];
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
          node.expression.expression.getText(source) === "console" &&
          consoleMethods.has(node.expression.name.text)) {
        sinks.push({ file, expression: node.getText(source) });
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    return sinks;
  });

for (const mode of ["development", "production"] as const) {
  test.describe(`safe diagnostics in ${mode}`, () => {
    let previousMode: string | undefined;
    test.beforeEach(() => {
      previousMode = process.env.NODE_ENV;
      Object.assign(process.env, { NODE_ENV: mode });
    });
    test.afterEach(() => {
      if (previousMode === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
      else Object.assign(process.env, { NODE_ENV: previousMode });
    });

    test("serializer excludes raw fields, echoed messages and query while retaining status/code", () => {
      const raw = makeError();
      const apiError = transformToApiError(raw);
      expect(apiError.originalError).toBe(raw);
      expect(apiError.message).toBe(secrets[4]);
      expect(apiError.details).toEqual(raw.response?.data.details);
      const diagnostic = serializeApiError(apiError);
      expect(diagnostic).toEqual({
        status: 400, code: "COUNT_INVALID", message: "Некорректные данные запроса",
        route: "/participant/password",
      });
      const captured = captureConsole();
      try {
        for (const error of [raw, apiError, new Error(secrets[4]), { details: secrets[3] }, null]) {
          console.error(serializeApiError(error));
        }
        logApiError(apiError, requestUrl);
        expect(captured.calls).toHaveLength(mode === "development" ? 6 : 5);
        expectSafe(captured.calls);
      } finally { captured.restore(); }

      expect(serializeApiError(new ApiError(secrets[4], secrets[3], 500))).toEqual({
        status: 500, code: "UNKNOWN", message: "Ошибка сервера",
      });
      expect(serializeApiError(new ApiError(secrets[4], "TIMEOUT", NaN))).toEqual({
        code: "TIMEOUT", message: "Ошибка выполнения запроса",
      });
      expect(serializeApiError(raw, `/auth/refresh?token=${secrets[1]}`).route).toBe("/auth/refresh");
      expect(serializeApiError(raw, `//user:${secrets[2]}@fixture.invalid/auth/login?password=${secrets[2]}`).route).toBe("/auth/login");
      expect(serializeApiError(raw, `http://[${secrets[2]}`).route).toBeUndefined();
    });

    test("every application console sink emits only safe arguments", () => {
      const sinks = [...consoleSinks("src"), ...consoleSinks("app")];
      expect(sinks.length).toBeGreaterThan(20);
      const captured = captureConsole();
      try {
        for (const sink of sinks) {
          const before = captured.calls.length;
          vm.runInNewContext(sink.expression, {
            console, serializeApiError,
            error: transformToApiError(makeError()), sendError: makeError(),
            context: requestUrl, message: "Fixture operation failed", timestamp: "12:00:00",
          }, { filename: sink.file });
          expect(captured.calls.length, sink.file).toBe(before + 1);
          expectSafe(captured.calls.slice(before));
          for (const arg of captured.calls[before]) {
            if (typeof arg === "object" && arg !== null) {
              expect(Object.keys(arg).sort(), sink.file).toEqual(["code", "message", "route", "status"]);
              expect(arg, sink.file).toMatchObject({ code: "COUNT_INVALID", status: 400 });
            }
          }
        }
      } finally { captured.restore(); }
    });

    test("HTTP response, API-config failure and refresh failure use safe diagnostics", async () => {
      const captured = captureConsole();
      try {
        const configError = makeError(500);
        const mocks = {
          axios,
          "@/shared/lib/errorHandler": errorHandler,
          "@/shared/lib": {
            tokenStorage: { canRefresh: () => true, getAccessToken: () => secrets[0] },
            tokenRefreshManager: { reset: () => {} },
          },
          "@/shared/config/env": { getServerApiBaseUrl: () => "https://fixture.invalid", parseRuntimeApiUrl },
          "./authSessionAdapter": {
            getAuthSessionAdapter: () => ({
              getSessionSignal: () => new AbortController().signal,
              refreshAccessToken: async () => { throw makeError(503); },
              onSessionExpired: () => {},
            }),
          },
        };
        const configClient = loadModule<{ preloadApiConfig: () => Promise<void> }>(
          "src/shared/api/axios/instances.ts", mocks,
          { window: {}, fetch: async () => { throw configError; } },
        );
        const configResult = await configClient.preloadApiConfig().then(
          () => undefined,
          (error: unknown) => error,
        );
        if (mode === "production") {
          expect(configResult).toBeInstanceOf(ApiError);
          expect(configResult).toMatchObject({ statusCode: 500, originalError: configError });
        } else expect(configResult).toBeUndefined();
        const { publicClient, authClient } = loadModule<{
          publicClient: AxiosInstance; authClient: AxiosInstance;
        }>("src/shared/api/axios/instances.ts", mocks, {
          window: {}, fetch: async () => ({
            ok: true,
            json: async () => ({ apiUrl: `https://user:${secrets[2]}@fixture.invalid` }),
          }),
        });
        const adapter: AxiosAdapter = async (config) => {
          const error = makeError(config.url?.includes("/private") ? 401 : 400);
          error.config = config;
          throw error;
        };
        publicClient.defaults.adapter = adapter;
        authClient.defaults.adapter = adapter;
        await expect(publicClient.get(`/participant/password?oldPassword=${secrets[2]}`)).rejects.toMatchObject({ statusCode: 400 });
        await expect(authClient.get(`/private?token=${secrets[1]}`)).rejects.toMatchObject({ statusCode: 503 });
        expectSafe(captured.calls);
        const diagnostics = captured.calls.flat().filter((arg): arg is errorHandler.ApiErrorDiagnostic =>
          typeof arg === "object" && arg !== null && "status" in arg);
        expect(diagnostics.map((item) => item.status)).toEqual(mode === "development" ? [500, 400, 503, 503] : []);
      } finally { captured.restore(); }
    });

    test("product and order mutation callbacks serialize failures", () => {
      const captured = captureConsole();
      const queryMock = {
        useQueryClient: () => ({}),
      };
      const privateQueryMock = {
        usePrivateScope: () => ({ isCurrent: () => true, key: (key: unknown) => key }),
        usePrivateMutation: (options: unknown) => options,
      };
      type MutationHooks = Record<string, () => { onError?: (error: unknown) => void }>;
      try {
        const productHooks = loadModule<MutationHooks>("src/entities/product/model/useProductMutations.ts", {
          "@/shared/lib/query": privateQueryMock,
          "@/shared/lib/errorHandler": errorHandler,
          "@tanstack/react-query": queryMock,
          "@/entities/image/@x/product": { imageApi: {} },
          "../api/productApi": { productApi: {} },
          "./queryKeys": { productKeys: {} },
        });
        const orderHooks = loadModule<MutationHooks>("src/entities/order/model/useOrderMutations.ts", {
          "@/shared/lib/query": privateQueryMock,
          "@/shared/lib/errorHandler": errorHandler,
          "@tanstack/react-query": queryMock,
          "../api/orderApi": { orderApi: {} },
          "./queryKeys": { orderQueryKeys: {} },
        });
        for (const hook of [...Object.values(productHooks), ...Object.values(orderHooks)]) {
          hook().onError?.(makeError());
        }
        expect(captured.calls).toHaveLength(10);
        expectSafe(captured.calls);
        for (const args of captured.calls) expect(args[1]).toMatchObject({ status: 400, code: "COUNT_INVALID" });
      } finally { captured.restore(); }
    });

    test("auth initialization and refresh catches keep diagnostics safe", async () => {
      const initial = useAuthStore.getState();
      const getAccess = tokenStorage.getAccessToken;
      const refresh = authApi.refreshAccessToken;
      const captured = captureConsole();
      try {
        tokenStorage.getAccessToken = () => { throw makeError(500); };
        await useAuthStore.getState().initializeAuth();
        authApi.refreshAccessToken = async () => { throw makeError(401); };
        expect(await useAuthStore.getState().refreshToken()).toBe(false);
        expectSafe(captured.calls);
        expect(captured.calls.flat()).toEqual(expect.arrayContaining([
          expect.objectContaining({ status: 500, code: "COUNT_INVALID" }),
          expect.objectContaining({ status: 401, code: "COUNT_INVALID" }),
        ]));
      } finally {
        captured.restore();
        tokenStorage.getAccessToken = getAccess;
        authApi.refreshAccessToken = refresh;
        useAuthStore.setState(initial, true);
      }
    });

    test("proactive refresh failure logs safely through the real timer callback", async () => {
      const timers: Array<() => Promise<void>> = [];
      const captured = captureConsole();
      try {
        const { tokenRefreshManager } = loadModule<{
          tokenRefreshManager: typeof import("@/shared/lib").tokenRefreshManager;
        }>("src/shared/lib/token/tokenRefreshManager.ts", {
          "../errorHandler": errorHandler,
          "./tokenStorage": { tokenStorage: {
            getAccessToken: () => secrets[0], getRefreshToken: () => secrets[1],
            getTokenCreatedAt: () => Date.now(),
          } },
        }, {
          window: {},
          setTimeout: (callback: () => Promise<void>) => { timers.push(callback); return timers.length; },
          clearTimeout: () => {},
        });
        tokenRefreshManager.init({ refreshToken: async () => { throw makeError(503); }, logout: () => {} });
        expect(timers).toHaveLength(1);
        await timers[0]();
        expectSafe(captured.calls);
        expect(captured.calls.flat()).toEqual(mode === "development" ? expect.arrayContaining([
          expect.objectContaining({ status: 503, code: "COUNT_INVALID" }),
        ]) : []);
        tokenRefreshManager.destroy();
      } finally { captured.restore(); }
    });
  });
}
