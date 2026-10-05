import { expect, test } from "@playwright/test";
import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import * as errorHandler from "@/shared/lib/errorHandler";
import * as authTypes from "@/entities/session/model/types";
import type { useAuthStore as AuthStore } from "@/entities/session/model/authStore";
import type { tokenRefreshManager as Manager } from "@/shared/lib/token/tokenRefreshManager";
import type { AuthSessionAdapter } from "@/shared/api/axios/authSessionAdapter";

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

// Реальные store, API, manager и Axios interceptors; подменены только окружение и транспорт.
const fixture = () => {
  const timers = new Map<number, { callback: () => unknown; delay: number }>();
  let timerId = 0;
  const load = <T,>(file: string, mocks: Record<string, unknown>): T => {
    const module = { exports: {} };
    vm.runInNewContext(ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText, {
      module, exports: module.exports, process, console, AbortController,
      window: {},
      fetch: async () => ({ ok: true, json: async () => ({ apiUrl: "https://fixture.invalid" }) }),
      setTimeout: (callback: () => unknown, delay: number) => {
        timers.set(++timerId, { callback, delay });
        return timerId;
      },
      clearTimeout: (id: number) => timers.delete(id),
      require: (name: string) => {
        if (!(name in mocks)) throw new Error(`Missing mock: ${name}`);
        return mocks[name];
      },
    }, { filename: file });
    return module.exports as T;
  };
  const tokens: { accessToken?: string; refreshToken?: string } = {
    accessToken: "access-A", refreshToken: "refresh-A",
  };
  const tokenStorage = {
    getAccessToken: () => tokens.accessToken,
    getRefreshToken: () => tokens.refreshToken,
    getTokenCreatedAt: () => null,
    canRefresh: () => !!tokens.refreshToken,
    saveTokens: (next: typeof tokens) => Object.assign(tokens, next),
    clearTokens: () => { delete tokens.accessToken; delete tokens.refreshToken; },
  };
  const { tokenRefreshManager: manager } = load<{ tokenRefreshManager: typeof Manager }>(
    "src/shared/lib/token/tokenRefreshManager.ts", {
      "./tokenStorage": { tokenStorage }, "../errorHandler": errorHandler,
    },
  );
  const generation = load<typeof import("@/entities/session/model/sessionGeneration")>(
    "src/entities/session/model/sessionGeneration.ts", {},
  );
  let sessionAdapter: AuthSessionAdapter;
  const clients = load<{ authClient: AxiosInstance; publicClient: AxiosInstance }>(
    "src/shared/api/axios/instances.ts", {
      axios, "@/shared/lib": { tokenStorage },
      "@/shared/lib/errorHandler": errorHandler,
      "@/shared/config/env": { getServerApiBaseUrl: () => "https://fixture.invalid" },
      "./authSessionAdapter": { getAuthSessionAdapter: () => sessionAdapter },
    },
  );
  const api = load<typeof import("@/entities/session/api/authApi")>(
    "src/entities/session/api/authApi.ts", {
      axios, "@/shared/api": clients, "@/shared/lib": { tokenStorage },
      "../model/types": authTypes, "../model/sessionGeneration": generation,
    },
  );
  const { useAuthStore: store } = load<{ useAuthStore: typeof AuthStore }>(
    "src/entities/session/model/authStore.ts", {
      zustand: { create },
      "zustand/middleware": {
        persist: (initializer: Parameters<typeof persist>[0], options: Parameters<typeof persist>[1]) =>
          persist(initializer, { ...options, storage: createJSONStorage(() => ({
            getItem: () => null, setItem: () => {}, removeItem: () => {},
          })) }),
      },
      "@/shared/lib": { tokenStorage, tokenRefreshManager: manager },
      "@/shared/lib/errorHandler": errorHandler,
      "../api/authApi": api, "./sessionGeneration": generation,
    },
  );
  let expired = 0;
  sessionAdapter = {
    getSessionSignal: store.getState().getSessionSignal,
    refreshAccessToken: store.getState().refreshToken,
    onSessionExpired: () => { expired++; store.getState().logout(); },
  };
  manager.init({ refreshToken: store.getState().refreshToken, logout: store.getState().logout });
  store.setState({ isAuthenticated: true, isInitialized: true, accountRevision: 1 });
  const refreshes: ReturnType<typeof deferred<string>>[] = [];
  const sent: InternalAxiosRequestConfig[] = [];
  const response = (config: InternalAxiosRequestConfig, data: unknown) => ({
    config, data, status: 200, statusText: "OK", headers: {},
  });
  clients.publicClient.defaults.adapter = async (config) => {
    if (config.url?.endsWith("/auth/login")) {
      return response(config, { access_token: "access-B", refresh_token: "refresh-B" });
    }
    const gate = deferred<string>();
    refreshes.push(gate);
    return response(config, await gate.promise);
  };
  clients.authClient.defaults.adapter = async (config) => {
    sent.push(config);
    if (config.headers.Authorization === "Bearer fresh") return response(config, {});
    throw new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, undefined, {
      ...response(config, {}), status: 401,
    });
  };
  const fire = (delay: number) => {
    const matches = [...timers].filter(([, timer]) => timer.delay === delay);
    expect(matches.length).toBeGreaterThan(0);
    return matches.map(([id, timer]) => { timers.delete(id); return timer.callback(); });
  };
  return { ...clients, store, manager, tokens, refreshes, sent, timers, fire,
    expired: () => expired,
  };
};

test("timer, initialization and concurrent 401 share one refresh and preserve account scope", async () => {
  const f = fixture();
  const timer = f.fire(28 * 60 * 1000);
  delete f.tokens.accessToken;
  f.store.setState({ isInitialized: false });
  const initialization = f.store.getState().initializeAuth();
  const a = f.authClient.post("/first");
  const b = f.authClient.post("/second");
  await expect.poll(() => f.sent.length).toBe(2);
  expect(f.refreshes).toHaveLength(1);
  f.refreshes[0].resolve("fresh");
  await Promise.all([a, b, initialization, ...timer]);
  expect(f.refreshes).toHaveLength(1);
  expect(f.sent).toHaveLength(4);
  expect(f.store.getState()).toMatchObject({ isAuthenticated: true, isInitialized: true, accountRevision: 1 });
  expect([...f.timers.values()].map(t => t.delay)).toEqual([28 * 60 * 1000]);
});

for (const action of ["logout", "login"] as const) {
  for (const result of ["success", "error"] as const) {
    test(`late refresh ${result} after ${action} cannot change tokens, store or timers`, async () => {
      const f = fixture();
      const timer = f.fire(28 * 60 * 1000);
      delete f.tokens.accessToken;
      const initialization = f.store.getState().initializeAuth();
      const requests = [f.authClient.post("/leader"), f.authClient.post("/queue")]
        .map(p => p.catch(error => error));
      await expect.poll(() => f.sent.length).toBe(2);
      await expect.poll(() => f.refreshes.length).toBe(1);
      if (action === "logout") f.store.getState().logout();
      else await f.store.getState().login("B", "fixture");
      const state = f.store.getState();
      const tokens = { ...f.tokens };
      const timers = [...f.timers];
      for (const error of await Promise.all(requests)) expect(axios.isCancel(error)).toBe(true);
      if (result === "success") f.refreshes[0].resolve("old-A");
      else f.refreshes[0].reject(new Error("old failure"));
      await Promise.all([initialization, ...timer]);
      expect(f.tokens).toEqual(tokens);
      expect(f.store.getState()).toBe(state);
      expect([...f.timers]).toEqual(timers);
      expect(f.sent).toHaveLength(2);
      expect(f.expired()).toBe(0);
    });
  }
}

for (const ending of ["timeout", "abort"] as const) {
  test(`${ending} terminates leader and queue before late refresh success`, async () => {
    const f = fixture();
    const controllers = [new AbortController(), new AbortController()];
    const requests = controllers.map((c, i) => f.authClient.post(`/write-${i}`, {}, { signal: c.signal })
      .catch(error => error));
    await expect.poll(() => [...f.timers.values()].filter(t => t.delay === 10000).length).toBe(2);
    if (ending === "timeout") f.fire(10000);
    else controllers.forEach(c => c.abort());
    const errors = await Promise.all(requests);
    for (const error of errors) {
      if (ending === "timeout") expect(error.code).toBe("REFRESH_TIMEOUT");
      else expect(axios.isCancel(error)).toBe(true);
    }
    expect([...f.timers.values()].some(t => t.delay === 10000)).toBe(false);
    f.refreshes[0].resolve("fresh");
    await f.store.getState().refreshToken();
    // Новый допустимый запрос — barrier после всех callbacks завершившегося refresh.
    await f.authClient.post("/active");
    expect(f.sent.map(c => c.url)).toEqual([
      "https://fixture.invalid/write-0", "https://fixture.invalid/write-1", "https://fixture.invalid/active",
    ]);
    expect(f.expired()).toBe(0);
  });
}

test("cancelling leader leaves live queue able to replay", async () => {
  const f = fixture();
  const leader = new AbortController();
  const a = f.authClient.post("/leader", {}, { signal: leader.signal }).catch(error => error);
  const b = f.authClient.post("/queue");
  await expect.poll(() => [...f.timers.values()].filter(t => t.delay === 10000).length).toBe(2);
  leader.abort();
  expect(axios.isCancel(await a)).toBe(true);
  f.refreshes[0].resolve("fresh");
  await b;
  expect(f.sent.map(c => c.url)).toEqual([
    "https://fixture.invalid/leader", "https://fixture.invalid/queue", "https://fixture.invalid/queue",
  ]);
});

test("late 401 from A does not start refresh or expire B", async () => {
  const f = fixture();
  const gate = deferred<void>();
  let dispatched = false;
  f.authClient.defaults.adapter = async config => {
    dispatched = true;
    await gate.promise;
    throw new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, undefined, {
      config, data: {}, status: 401, statusText: "Unauthorized", headers: {},
    });
  };
  const request = f.authClient.post("/old").catch(error => error);
  await expect.poll(() => dispatched).toBe(true);
  await f.store.getState().login("B", "fixture");
  gate.resolve();
  expect(axios.isCancel(await request)).toBe(true);
  expect(f.refreshes).toHaveLength(0);
  expect(f.expired()).toBe(0);
  expect(f.tokens.accessToken).toBe("access-B");
});

test("old refresh settlement cannot release the new generation's pending refresh", async () => {
  const f = fixture();
  const a = f.store.getState().refreshToken();
  await expect.poll(() => f.refreshes.length).toBe(1);
  await f.store.getState().login("B", "fixture");
  const b = f.store.getState().refreshToken();
  await expect.poll(() => f.refreshes.length).toBe(2);
  f.refreshes[0].resolve("old-A");
  expect(await a).toBe(false);
  expect(f.store.getState().refreshToken()).toBe(b);
  f.refreshes[1].resolve("fresh");
  expect(await b).toBe(true);
  expect(f.tokens).toEqual({ accessToken: "fresh", refreshToken: "refresh-B" });
});
