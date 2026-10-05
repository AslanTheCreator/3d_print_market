import { expect, test } from "@playwright/test";
import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as errorHandler from "@/shared/lib/errorHandler";
import { parseRuntimeApiUrl } from "@/shared/config/env";

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const json = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
type ConfigResponse = ReturnType<typeof json>;
type Clients = { publicClient: AxiosInstance; authClient: AxiosInstance; preloadApiConfig(): Promise<void> };

const fixture = (options: {
  mode?: "production" | "development";
  server?: boolean;
  fallback?: () => string;
} = {}) => {
  const timers = new Map<number, { run(): void; delay: number }>();
  let id = 0;
  const fetches: { signal: AbortSignal; gate: ReturnType<typeof deferred<ConfigResponse>> }[] = [];
  const session = new AbortController();
  const refresh = deferred<boolean>();
  let token = "old";
  const module = { exports: {} };
  const mocks: Record<string, unknown> = {
    axios, "@/shared/lib/errorHandler": errorHandler,
    "@/shared/config/env": {
      getServerApiBaseUrl: options.fallback ?? (() => "https://fallback.invalid/api"),
      parseRuntimeApiUrl,
    },
    "@/shared/lib": { tokenStorage: { getAccessToken: () => token, canRefresh: () => true } },
    "./authSessionAdapter": { getAuthSessionAdapter: () => ({
      getSessionSignal: () => session.signal,
      refreshAccessToken: () => refresh.promise,
      onSessionExpired: () => { throw new Error("Unexpected session expiry"); },
    }) },
  };
  vm.runInNewContext(ts.transpileModule(readFileSync("src/shared/api/axios/instances.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    module, exports: module.exports,
    require: (name: string) => {
      if (!(name in mocks)) throw new Error(`Missing mock: ${name}`);
      return mocks[name];
    },
    process: { env: { NODE_ENV: options.mode ?? "production" } }, console,
    AbortController, window: options.server ? undefined : {},
    setTimeout: (run: () => void, delay: number) => { timers.set(++id, { run, delay }); return id; },
    clearTimeout: (key: number) => timers.delete(key),
    fetch: (_url: string, init: { signal: AbortSignal }) => {
      const gate = deferred<ConfigResponse>();
      fetches.push({ signal: init.signal, gate });
      return gate.promise;
    },
  });
  const clients = module.exports as Clients;
  const sent: { url: string; config: InternalAxiosRequestConfig }[] = [];
  const transport = async (config: InternalAxiosRequestConfig) => {
    sent.push({ url: clients.publicClient.getUri(config), config });
    return { config, data: {}, status: 200, statusText: "OK", headers: {} };
  };
  clients.publicClient.defaults.adapter = transport;
  clients.authClient.defaults.adapter = transport;
  return {
    ...clients, fetches, timers, sent, session,
    succeedRefresh: () => { token = "fresh"; refresh.resolve(true); },
    expire: () => {
      const pending = [...timers.values()];
      expect(pending).toHaveLength(1);
      expect(pending[0].delay).toBe(10000);
      pending[0].run();
    },
  };
};

for (const phase of ["headers", "body"] as const) {
  test(`config ${phase} deadline rejects all consumers, aborts transport and permits retry`, async () => {
    const f = fixture();
    const requests = [f.preloadApiConfig(), f.publicClient.get("/public", { timeout: 1 }), f.authClient.post("/private")]
      .map(p => p.catch(error => error));
    await expect.poll(() => f.fetches.length).toBe(1);
    const body = deferred<unknown>();
    if (phase === "body") {
      f.fetches[0].gate.resolve({ ok: true, status: 200, json: () => body.promise });
      await f.fetches[0].gate.promise;
    }
    f.expire();
    for (const error of await Promise.all(requests)) {
      expect(error).toBeInstanceOf(errorHandler.ApiError);
      expect(error).toMatchObject({ code: "TIMEOUT", statusCode: 408 });
    }
    expect(f.fetches[0].signal.aborted).toBe(true);
    expect(f.sent).toHaveLength(0);
    expect(f.timers.size).toBe(0);
    const retry = f.publicClient.get("/retry");
    await expect.poll(() => f.fetches.length).toBe(2);
    f.fetches[1].gate.resolve(json({ apiUrl: "/new-proxy/" }));
    await retry;
    if (phase === "headers") f.fetches[0].gate.resolve(json({ apiUrl: "/stale" }));
    else body.resolve({ apiUrl: "/stale" });
    await f.publicClient.get("/cached");
    expect(f.sent.map(s => s.url)).toEqual(["/new-proxy/retry", "/new-proxy/cached"]);
    expect(f.fetches).toHaveLength(2);
  });
}

for (const cancellation of ["request", "session"] as const) {
  test(`${cancellation} cancellation leaves the shared config and other consumers alive`, async () => {
    const f = fixture();
    const request = new AbortController();
    const cancelled = f.authClient.get("/cancelled", { signal: request.signal }).catch(error => error);
    const active = f.publicClient.get("/active");
    const preload = f.preloadApiConfig();
    await expect.poll(() => f.fetches.length).toBe(1);
    (cancellation === "request" ? request : f.session).abort();
    expect(axios.isCancel(await cancelled)).toBe(true);
    expect(f.fetches[0].signal.aborted).toBe(false);
    f.fetches[0].gate.resolve(json({ apiUrl: " https://fixture.invalid/api/// " }));
    await Promise.all([active, preload]);
    expect(f.sent.map(s => s.url)).toEqual(["https://fixture.invalid/api/active"]);
    expect(f.fetches).toHaveLength(1);
    expect(f.timers.size).toBe(0);
  });
}

test("invalid config, HTTP and JSON failures are normalized and never cached as success", async () => {
  const invalid = [null, [], {}, { apiUrl: null }, { apiUrl: 1 }, { apiUrl: {} },
    ...["", "  ", "ftp://fixture.invalid", "not-a-url", "//fixture.invalid"].map(apiUrl => ({ apiUrl })),
  ];
  for (const response of [
    ...invalid.map(json),
    { ok: false, status: 503, json: async () => ({}) },
    { ok: true, status: 200, json: async () => { throw new SyntaxError("Bad JSON"); } },
  ]) {
    const f = fixture();
    const failed = f.publicClient.get("/first").catch(error => error);
    await expect.poll(() => f.fetches.length).toBe(1);
    f.fetches[0].gate.resolve(response);
    expect(await failed).toBeInstanceOf(errorHandler.ApiError);
    expect(f.sent).toHaveLength(0);
    expect(f.timers.size).toBe(0);
    const retry = f.publicClient.get("/retry");
    await expect.poll(() => f.fetches.length).toBe(2);
    f.fetches[1].gate.resolve(json({ apiUrl: "/proxy" }));
    await retry;
    expect(f.sent[0].url).toBe("/proxy/retry");
  }
});

test("development keeps fallback policy and normalizes a failed fallback", async () => {
  const f = fixture({ mode: "development" });
  const request = f.publicClient.get("/first");
  await expect.poll(() => f.fetches.length).toBe(1);
  f.expire();
  await request;
  await f.publicClient.get("/cached");
  expect(f.sent.map(s => s.url)).toEqual([
    "https://fallback.invalid/api/first", "https://fallback.invalid/api/cached",
  ]);
  expect(f.fetches).toHaveLength(1);
  expect(f.fetches[0].signal.aborted).toBe(true);
  const badFallback = fixture({ mode: "development", fallback: () => { throw new Error("Invalid env"); } });
  const preload = badFallback.preloadApiConfig().catch(error => error);
  badFallback.fetches[0].gate.reject(new Error("Config unavailable"));
  expect(await preload).toBeInstanceOf(errorHandler.ApiError);
  const retry = badFallback.preloadApiConfig();
  badFallback.fetches[1].gate.resolve(json({ apiUrl: "/restored" }));
  await retry;
});

for (const base of ["https://fixture.invalid/api/", "/proxy/", "/"]) {
  test(`${base} preserves leader/queue URLs on 401 replay and repeated interception`, async () => {
    const f = fixture();
    const seen: { endpoint: string | undefined; uri: string }[] = [];
    f.authClient.defaults.adapter = async config => {
      seen.push({ endpoint: config.url, uri: f.authClient.getUri(config) });
      const response = { config, data: {}, status: 200, statusText: "OK", headers: {} };
      if (config.headers.Authorization !== "Bearer fresh") {
        throw new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, undefined, { ...response, status: 401 });
      }
      return response;
    };
    const leader = f.authClient.post("/leader?existing=1", {}, { params: { extra: "2" } });
    const queue = f.authClient.get("queue");
    await expect.poll(() => f.fetches.length).toBe(1);
    f.fetches[0].gate.resolve(json({ apiUrl: base }));
    await expect.poll(() => seen.length).toBe(2);
    f.succeedRefresh();
    const [first] = await Promise.all([leader, queue]);
    await f.authClient.request(first.config);
    const prefix = base.replace(/\/+$/, "");
    expect(seen.filter(s => s.endpoint === "/leader?existing=1").map(s => s.uri)).toEqual(
      Array(3).fill(`${prefix}/leader?existing=1&extra=2`),
    );
    expect(seen.filter(s => s.endpoint === "queue").map(s => s.uri)).toEqual(Array(2).fill(`${prefix}/queue`));
    const absolute = "https://other.invalid/unchanged?x=1";
    await f.authClient.get(absolute);
    expect(seen.at(-1)).toEqual({ endpoint: absolute, uri: absolute });
    expect(f.fetches).toHaveLength(1);
    expect(f.timers.size).toBe(0);
  });
}

test("server preparation uses existing env selection without browser config fetch", async () => {
  const f = fixture({ server: true });
  await Promise.all([f.publicClient.get("/public"), f.authClient.get("/private"), f.preloadApiConfig()]);
  expect(f.sent.map(s => s.url).sort()).toEqual(["https://fallback.invalid/api/private", "https://fallback.invalid/api/public"]);
  expect(f.fetches).toHaveLength(0);
  expect(f.timers.size).toBe(0);
});
