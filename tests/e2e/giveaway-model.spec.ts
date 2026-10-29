import { expect, test } from "@playwright/test";
import { giveawayApi, getGiveawayTiming, getGiveawayWindow, parseGiveawayDate, formatGiveawayCountdown, getProductPublicPath, type GiveawayResponse } from "@/entities/product";
import { publicClient, authClient } from "@/shared/api";
import { ApiError } from "@/shared/lib/errorHandler";
import { getSafeTelegramUrl } from "@/shared/lib";
import { getSafeCaseTelegramUrl } from "@/entities/order";

const start = Date.parse("2027-06-01T12:00:00Z"), end = start + 120_000;
const data: GiveawayResponse = { productId: 42, status: "ACTIVE", startAt: new Date(start).toISOString(), endAt: new Date(end).toISOString() };

test("dates require a valid calendar date, explicit timezone and increasing window", () => {
  expect(parseGiveawayDate("2027-06-01T15:00:00+03:00")).toBe(start);
  expect(parseGiveawayDate("2027-06-01T12:00Z")).toBe(start);
  expect(parseGiveawayDate("2028-02-29T00:00:00Z")).not.toBeNull();
  for (const date of [undefined, null, "", "2027-06-01", "2027-06-01T12:00:00", "2027-02-29T12:00:00Z", "2027-02-30T12:00:00Z", "2027-13-01T12:00:00Z", "2027-06-01T24:00:00Z", "2027-06-01T12:60:00Z", "2027-06-01T12:00:60Z", "invalid"])
    expect(parseGiveawayDate(date), String(date)).toBeNull();
  for (const patch of [{ startAt: undefined }, { endAt: null }, { endAt: data.startAt }, { startAt: data.endAt, endAt: data.startAt }])
    expect(getGiveawayWindow({ ...data, ...patch })).toBeNull();
});

test("scheduled/start/end boundaries are exact; sparse and nonpublic statuses never authorize participation", () => {
  expect(getGiveawayTiming({ ...data, status: "AWAITING_GIVEAWAY" }, start - 1)).toEqual({ phase: "scheduled", remainingMs: 1 });
  expect(getGiveawayTiming(data, start)).toEqual({ phase: "active", remainingMs: 120_000 });
  expect(getGiveawayTiming(data, end - 1)).toEqual({ phase: "active", remainingMs: 1 });
  expect(getGiveawayTiming(data, end)).toEqual({ phase: "ended", remainingMs: 0 });
  for (const status of [undefined, null, "BLOCKED", "DELETED", "TIME_EXPIRED"] as const)
    expect(getGiveawayTiming({ ...data, status }, start).phase).toBe("unavailable");
  for (const value of [null, undefined, {}]) expect(getGiveawayTiming(value, start).phase).toBe("unavailable");
  expect(getGiveawayTiming(data, NaN).phase).toBe("unavailable");
  expect(formatGiveawayCountdown(1)).toBe("00:00:01");
  expect(formatGiveawayCountdown(86_461_001)).toBe("1 д. 00:01:02");
  expect(formatGiveawayCountdown(-1)).toBe("00:00:00");
  expect(formatGiveawayCountdown(Infinity)).toBe("—");
});

test("giveaway API uses public GET and AbortSignal; only its 404 becomes absence", async () => {
  const original = publicClient.get, privateGet = authClient.get;
  const calls: unknown[][] = []; const controller = new AbortController();
  let failure: unknown;
  publicClient.get = (async (...args: unknown[]) => { calls.push(args); if (failure) throw failure; return { data }; }) as typeof publicClient.get;
  authClient.get = (() => { throw new Error("Private client must not be used"); }) as typeof authClient.get;
  try {
    expect(await giveawayApi.active(controller.signal)).toEqual(data);
    expect(await giveawayApi.detail(42, controller.signal)).toEqual(data);
    expect(calls).toEqual([["/giveaways/active", { signal: controller.signal }], ["/giveaways/products/42", { signal: controller.signal }]]);
    failure = new ApiError("absent", undefined, 404);
    expect(await giveawayApi.active()).toBeNull(); expect(await giveawayApi.detail(42)).toBeNull();
    for (const error of [new ApiError("server", undefined, 500), new ApiError("access", undefined, 403), new ApiError("network", "NETWORK_ERROR"), new Error("cancelled")]) {
      failure = error;
      await expect(giveawayApi.active()).rejects.toBe(error);
      await expect(giveawayApi.detail(42)).rejects.toBe(error);
    }
  } finally { publicClient.get = original; authClient.get = privateGet; }
});

test("invalid IDs fail before GET; malformed and foreign responses are errors while sparse DTO stays sparse", async () => {
  const original = publicClient.get;
  let calls = 0; let result: unknown = {};
  publicClient.get = (async () => { calls++; return { data: result }; }) as typeof publicClient.get;
  try {
    for (const id of [0, -1, 1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]) expect(() => giveawayApi.detail(id)).toThrow();
    expect(calls).toBe(0);
    expect(await giveawayApi.detail(42)).toEqual({});
    for (const response of [null, [], { productId: 43 }, { productId: -1 }, { imageIds: [0] }, { name: {} }, { winnersCount: 1.5 }]) {
      result = response; await expect(giveawayApi.detail(42)).rejects.toThrow("Некорректные данные");
    }
  } finally { publicClient.get = original; }
});

test("Telegram policy is shared with cases and rejects unsafe schemes, hosts and credentials", () => {
  for (const url of ["https://t.me/gift", "https://telegram.me/+invite", "https://T.ME/gift?start=1"]) {
    expect(getSafeTelegramUrl(url)).not.toBeNull(); expect(getSafeCaseTelegramUrl(url)).toBe(getSafeTelegramUrl(url));
  }
  for (const url of [undefined, null, "javascript:alert(1)", "http://t.me/gift", "tg://resolve?domain=gift", "https://t.me.evil.test/gift", "https://evil.test/t.me/gift", "https://user:pass@t.me/gift", "https://t.me:8443/gift", "https://t.me/", "https://telegram.me", "//t.me/gift"])
    expect(getSafeTelegramUrl(url), String(url)).toBeNull();
  expect(getProductPublicPath(42, "GIVEAWAY")).toBe("/giveaways/42");
  for (const type of ["PURCHASABLE", "PREORDER", "EXTERNAL_PRODUCT"] as const) expect(getProductPublicPath(42, type)).toBe("/catalog/42/detail");
});
