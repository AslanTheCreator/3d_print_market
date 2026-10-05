import { expect, test } from "@playwright/test";
import { AxiosError } from "axios";
import { createJSONStorage } from "zustand/middleware";
import { authApi, useAuthStore, VerificationRequiredError } from "@/entities/session";
import { createAuthStorage } from "@/entities/session/model/authPersistence";
import { publicClient } from "@/shared/api";
import { tokenStorage } from "@/shared/lib";
import { ApiError } from "@/shared/lib/errorHandler";

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
