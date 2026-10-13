import { expect, test } from "@playwright/test";
import { AxiosError } from "axios";
import { createJSONStorage } from "zustand/middleware";
import { QueryClient } from "@tanstack/react-query";
import { bindPrivateDataLifecycle } from "@/app/providers/privateDataLifecycle";
import { createPrivateScope } from "@/shared/lib/query";
import { authApi, useAuthStore, VerificationRequiredError } from "@/entities/session";
import { createAuthStorage } from "@/entities/session/model/authPersistence";
import { publicClient } from "@/shared/api";
import { tokenStorage } from "@/shared/lib";
import { ApiError } from "@/shared/lib/errorHandler";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}

// P01: план/FTA-034 и docs/api-and-auth.md — завершённое поколение не владеет
// cookies, user или private scope. Подменены только транспорт и storage.
for (const operation of ["login", "verify"] as const) {
  for (const completion of ["after logout", "before new login completes", "after new login completes"] as const) {
    test(`late ${operation} ${completion} cannot restore tokens, user or private data`, async () => {
      const initial = useAuthStore.getState();
      const options = useAuthStore.persist.getOptions();
      const originalStorage = { ...tokenStorage };
      const adapter = publicClient.defaults.adapter;
      const client = new QueryClient();
      const cookies: { accessToken?: string; refreshToken?: string } = {};
      const writes: typeof cookies[] = [];
      const disk = new Map<string, string>();
      const late = deferred<void>();
      const started = deferred<void>();
      const next = deferred<void>();
      const nextStarted = deferred<void>();
      let unbind = () => {};
      let pending: Promise<boolean> | undefined;
      let newLogin: Promise<boolean> | undefined;
      try {
        useAuthStore.persist.setOptions({ storage: createJSONStorage(() => ({
          getItem: key => disk.get(key) ?? null,
          setItem: (key, value) => { disk.set(key, value); },
          removeItem: key => { disk.delete(key); },
        })) });
        Object.assign(tokenStorage, {
          getAccessToken: () => cookies.accessToken,
          getRefreshToken: () => cookies.refreshToken,
          saveTokens: (tokens: typeof cookies) => { writes.push({ ...tokens }); Object.assign(cookies, tokens); },
          clearTokens: () => { delete cookies.accessToken; delete cookies.refreshToken; },
        });
        publicClient.defaults.adapter = async config => {
          const payload = JSON.parse(config.data) as { mail?: string };
          const owner = config.url?.endsWith("/verify-code") || payload.mail === "late-A@example.test"
            ? "late-A" : payload.mail === "B@example.test" ? "B" : "A";
          if (owner === "late-A") { started.resolve(); await late.promise; }
          if (owner === "B") { nextStarted.resolve(); await next.promise; }
          return { config, status: 200, statusText: "OK", headers: {},
            data: { access_token: `access-${owner}`, refresh_token: `refresh-${owner}` } };
        };
        useAuthStore.getState().logout();
        await useAuthStore.getState().initializeAuth();
        expect(await useAuthStore.getState().login("A@example.test", "fixture-password")).toBe(true);
        const scope = createPrivateScope(useAuthStore.getState().accountRevision, () => true);
        let cleared = 0;
        unbind = bindPrivateDataLifecycle(client, scope, () => {}, () => { cleared++; });
        client.setQueryData(scope.key(["users"]), { owner: "A" });
        client.setQueryData(["admin", scope.id, "access"], { owner: "A" });
        pending = operation === "login"
          ? useAuthStore.getState().login("late-A@example.test", "fixture-password")
          : authApi.verifyCode(101, "12345");
        await started.promise;
        const generation = useAuthStore.getState().getSessionSignal();
        if (completion === "after logout") {
          useAuthStore.getState().logout();
        } else {
          newLogin = useAuthStore.getState().login("B@example.test", "fixture-password");
          await nextStarted.promise;
          if (completion === "after new login completes") {
            next.resolve();
            expect(await newLogin).toBe(true);
            expect(scope.isCurrent()).toBe(false);
            expect(client.getQueryCache().getAll()).toEqual([]);
            client.setQueryData(["private", useAuthStore.getState().accountRevision, "users"], { owner: "B" });
          }
        }
        expect(generation.aborted).toBe(true);
        const state = useAuthStore.getState();
        const currentGeneration = state.getSessionSignal();
        const savedCookies = { ...cookies };
        const savedPersistence = disk.get("auth-storage");
        const savedQueries = client.getQueryCache().getAll().map(query => ({ key: query.queryKey, data: query.state.data }));
        const savedCleared = cleared;
        const savedWrites = writes.length;
        late.resolve();
        expect(await pending).toBe(false);
        expect(useAuthStore.getState()).toEqual(state);
        expect(useAuthStore.getState().getSessionSignal()).toBe(currentGeneration);
        expect(currentGeneration.aborted).toBe(false);
        expect(cookies).toEqual(savedCookies);
        expect(writes).toHaveLength(savedWrites);
        expect(disk.get("auth-storage")).toBe(savedPersistence);
        expect(client.getQueryCache().getAll().map(query => ({ key: query.queryKey, data: query.state.data }))).toEqual(savedQueries);
        expect(cleared).toBe(savedCleared);
        if (newLogin) {
          next.resolve();
          expect(await newLogin).toBe(true);
          expect(cookies).toEqual({ accessToken: "access-B", refreshToken: "refresh-B" });
          expect(useAuthStore.getState()).toMatchObject({ isAuthenticated: true, user: { mail: "B@example.test" } });
        } else {
          expect(cookies).toEqual({});
          expect(useAuthStore.getState()).toMatchObject({ isAuthenticated: false, user: null });
          expect(client.getQueryCache().getAll()).toEqual([]);
        }
      } finally {
        late.resolve();
        next.resolve();
        await Promise.allSettled([pending, newLogin]);
        unbind();
        client.clear();
        useAuthStore.getState().logout();
        publicClient.defaults.adapter = adapter;
        Object.assign(tokenStorage, originalStorage);
        useAuthStore.persist.setOptions(options);
        useAuthStore.setState(initial, true);
      }
    });
  }
}

test.describe("optional auth persistence", () => {
  for (const failure of ["getItem", "setItem", "removeItem", "access"] as const) {
    test(`auth lifecycle survives storage ${failure} failure`, async () => {
      const initial = useAuthStore.getState();
      const options = useAuthStore.persist.getOptions();
      const originalStorage = { ...tokenStorage };
      const adapter = publicClient.defaults.adapter;
      const cookies: { accessToken?: string; refreshToken?: string } = {};
      const disk = new Map<string, string>();
      let failures = 0;
      const reject = () => { failures++; throw new Error("Storage unavailable"); };
      const storage = createAuthStorage(() => {
        if (failure === "access") return reject();
        return {
          getItem: (key: string) => failure === "getItem" ? reject() : disk.get(key) ?? null,
          setItem: (key: string, value: string) => {
            if (failure === "setItem") reject();
            disk.set(key, value);
          },
          removeItem: (key: string) => {
            if (failure === "removeItem") reject();
            disk.delete(key);
          },
          clear: () => disk.clear(), key: () => null, length: disk.size,
        };
      });
      const unhandled: unknown[] = [];
      const onUnhandled = (error: unknown) => { unhandled.push(error); };
      process.on("unhandledRejection", onUnhandled);
      try {
        Object.assign(tokenStorage, {
          getAccessToken: () => cookies.accessToken,
          getRefreshToken: () => cookies.refreshToken,
          saveTokens: (tokens: typeof cookies) => Object.assign(cookies, tokens),
          clearTokens: () => { delete cookies.accessToken; delete cookies.refreshToken; },
        });
        publicClient.defaults.adapter = async config => ({
          config, status: 200, statusText: "OK", headers: {},
          data: config.url?.endsWith("/auth/refresh") ? "fresh-access" : {
            access_token: "login-access", refresh_token: "login-refresh",
          },
        });
        useAuthStore.persist.setOptions({ storage: createJSONStorage(() => storage) });
        await useAuthStore.persist.rehydrate();
        if (failure === "removeItem") useAuthStore.persist.clearStorage();
        await useAuthStore.getState().initializeAuth();
        expect(useAuthStore.getState()).toMatchObject({ isInitialized: true, isAuthenticated: false });
        expect(await useAuthStore.getState().login("fixture@example.test", "secret-password")).toBe(true);
        expect(cookies).toEqual({ accessToken: "login-access", refreshToken: "login-refresh" });
        expect(useAuthStore.getState().isAuthenticated).toBe(true);
        await useAuthStore.getState().initializeAuth();
        expect(useAuthStore.getState().isAuthenticated).toBe(true);
        delete cookies.accessToken;
        await useAuthStore.getState().initializeAuth();
        expect(useAuthStore.getState()).toMatchObject({ isInitialized: true, isAuthenticated: true });
        expect(cookies.accessToken).toBe("fresh-access");
        expect(await useAuthStore.getState().refreshToken()).toBe(true);
        const saved = await storage.getItem("auth-storage");
        expect(JSON.parse(saved!)).toEqual({ state: { user: { mail: "fixture@example.test" } }, version: 0 });
        for (const value of [saved!, ...disk.values()]) {
          expect(value).not.toMatch(/accessToken|refreshToken|secret-password|login-access|fresh-access/);
        }
        useAuthStore.getState().logout();
        expect(cookies).toEqual({});
        expect(useAuthStore.getState()).toMatchObject({ isAuthenticated: false, user: null });
        useAuthStore.persist.clearStorage();
        expect(await storage.getItem("auth-storage")).toBeNull();
        await useAuthStore.getState().initializeAuth();
        await new Promise(resolve => setImmediate(resolve));
        expect(failures).toBe(1);
        expect(unhandled).toEqual([]);
      } finally {
        process.off("unhandledRejection", onUnhandled);
        publicClient.defaults.adapter = adapter;
        Object.assign(tokenStorage, originalStorage);
        useAuthStore.persist.setOptions(options);
        useAuthStore.setState(initial, true);
      }
    });
  }

  test("failed remove cannot restore stale user if storage becomes available again", async () => {
    let fails = false;
    const disk = new Map<string, string>();
    const storage = createAuthStorage(() => ({
      getItem: key => disk.get(key) ?? null,
      setItem: (key, value) => { disk.set(key, value); },
      removeItem: key => { if (fails) throw new Error("Denied"); disk.delete(key); },
      clear: () => {}, key: () => null, length: 0,
    }));
    storage.setItem("auth-storage", "old user");
    fails = true;
    storage.removeItem("auth-storage");
    fails = false;
    expect(disk.get("auth-storage")).toBe("old user");
    expect(await storage.getItem("auth-storage")).toBeNull();
    storage.setItem("auth-storage", "new user");
    expect(await storage.getItem("auth-storage")).toBe("new user");
  });
});

const malformed: unknown[] = [null, "error", [], {}, { code: "OTHER" },
  { code: "WAITING_VERIFY", next: null },
  ...[-1, Infinity, -Infinity, NaN, "30", null, undefined].map(retryAfterSec => ({
    code: "VERIFICATION_COOLDOWN", retryAfterSec,
  })),
];

test("login, verify and resend preserve normalized errors for malformed 403/429 bodies", async () => {
  const adapter = publicClient.defaults.adapter;
  try {
    for (const status of [403, 429]) {
      for (const body of malformed) {
        let original: AxiosError | undefined;
        publicClient.defaults.adapter = async config => {
          original = new AxiosError("HTTP failure", "ERR_BAD_REQUEST", config, undefined, {
            config, status, data: body, statusText: "Failure", headers: {},
          });
          throw original;
        };
        for (const call of [
          () => authApi.loginUser({ mail: "fixture@example.test", password: "fixture" }),
          () => authApi.sendVerificationCode("fixture@example.test"),
          () => authApi.verifyCode(123, "12345"),
        ]) {
          const error = await call().catch(error => error);
          expect(error).toBeInstanceOf(ApiError);
          expect(error.statusCode).toBe(status);
          expect(error.originalError).toBe(original);
        }
      }
    }
  } finally { publicClient.defaults.adapter = adapter; }
});

test("verified WAITING_VERIFY and finite nonnegative cooldown remain supported", async () => {
  const adapter = publicClient.defaults.adapter;
  let status = 403;
  let body: unknown = { code: "WAITING_VERIFY", next: "VERIFY_EMAIL", message: {} };
  publicClient.defaults.adapter = async config => {
    throw new AxiosError("HTTP failure", "ERR_BAD_REQUEST", config, undefined, {
      config, status, data: body, statusText: "Failure", headers: {},
    });
  };
  try {
    const error = await authApi.loginUser({ mail: "fixture@example.test", password: "fixture" }).catch(e => e);
    expect(error).toBeInstanceOf(VerificationRequiredError);
    expect(error.message).toBe("Необходимо подтвердить почту");
    expect(error.email).toBe("fixture@example.test");
    status = 429;
    for (const retryAfterSec of [0, 0.5, 30]) {
      body = { code: "VERIFICATION_COOLDOWN", retryAfterSec };
      expect(await authApi.sendVerificationCode("fixture@example.test")).toEqual({ success: false, retryAfterSec });
    }
  } finally { publicClient.defaults.adapter = adapter; }
});
