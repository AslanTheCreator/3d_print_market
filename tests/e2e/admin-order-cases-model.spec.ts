import { expect, test } from "@playwright/test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query";
import { authClient, publicClient } from "@/shared/api";
import {
  adminOrderCasesApi, adminOrderCaseKeys, adminOrderKeys, getAdminOrderCaseOutcomes, getSafeCaseTelegramUrl,
  orderQueryKeys, type OrderCaseDetail, type OrderCaseResolutionOutcome, type OrderStatus,
} from "@/entities/order";
import { userApi } from "@/entities/user";
import { useAuthStore } from "@/entities/session/model/authStore";
import { bindPrivateDataLifecycle } from "@/app/providers/privateDataLifecycle";
import { createPrivateScope, PrivateScopeContext } from "@/shared/lib/query";
import { ApiError } from "@/shared/lib/errorHandler";
import { useAdminCaseManagement } from "@/features/admin-order-case-management/model/useAdminCaseManagement";
import { matchesCaseAttempt, getAdminCaseFailure } from "@/features/admin-order-case-management/model/result";
import { formatCaseAmount } from "@/widgets/admin-orders/model/formatCaseAmount";
import { adminCaseFixture } from "./helpers/admin";

test("decision matrix uses kind/state and permits SELLER only for a dispute from ON_THE_WAY; LEGACY is read-only", () => {
  const statuses: OrderStatus[] = ["BOOKED", "AWAITING_PREPAYMENT", "AWAITING_PREPAYMENT_APPROVAL", "AWAITING_PAYMENT", "ASSEMBLING", "ON_THE_WAY", "DISPUTED", "COMPLETED", "FAILED", "CANCELLED"];
  for (const kind of ["CANCELLATION_REQUEST", "DISPUTE", "PAYMENT_APPEAL"] as const) for (const previous of [...statuses, undefined]) {
    const detail = adminCaseFixture(301, kind); detail.orderCase!.previousOrderStatus = previous;
    expect(getAdminOrderCaseOutcomes(detail)).toEqual(kind === "CANCELLATION_REQUEST" ? ["CANCELLED", "REJECTED"] : kind === "PAYMENT_APPEAL" || previous === "ON_THE_WAY" ? ["BUYER", "SELLER"] : ["BUYER"]);
    detail.orderCase!.state = "RESOLVED"; expect(getAdminOrderCaseOutcomes(detail)).toEqual([]);
  }
  for (const detail of [{}, { orderCase: { state: "OPEN", kind: "FUTURE" } }, { orderCase: { state: "OPEN", kind: "DISPUTE", outcome: "LEGACY" } }] as OrderCaseDetail[])
    expect(getAdminOrderCaseOutcomes(detail)).toEqual([]);
});

test("Telegram accepts only exact HTTPS Telegram hosts and money uses the order snapshot, without guessing missing/CREATE currency", () => {
  for (const url of ["https://t.me/discussion", "https://telegram.me/discussion?x=1&y=2"]) expect(getSafeCaseTelegramUrl(url)).toBe(url);
  for (const url of ["http://t.me/discussion", "https://t.me.evil.test/a", "https://evil.test/t.me/a", "https://user@t.me/a", "javascript:alert(1)", "https://t.me/"]) expect(getSafeCaseTelegramUrl(url)).toBeNull();
  expect(formatCaseAmount(6000.25, "USD")).toContain("6");
  expect(formatCaseAmount(6000, undefined)).toBe("6000 (валюта не указана)");
  expect(formatCaseAmount(6000, "CREATE")).toBe("6000 (техническая валюта CREATE)");
  expect(formatCaseAmount(null, "RUB")).toBe("Не указана");
});

test("four exact private contracts use signals, offset=page*50 and encoded query; no JSON/version or LEGACY writes", async () => {
  const original = { get: authClient.get, put: authClient.put, post: authClient.post, publicPost: publicClient.post };
  const signal = new AbortController().signal; let reads = 0, writes = 0;
  authClient.get = (async (url, config) => {
    expect(config?.signal).toBe(signal); reads++;
    if (String(url).endsWith("/order-cases")) { expect(config?.params as Record<string, unknown>).toEqual({ state: "RESOLVED", limit: 50, offset: 100 }); return { data: [] }; }
    expect(url).toBe("/admin/actions/order-cases/301"); return { data: adminCaseFixture() };
  }) as typeof authClient.get;
  authClient.put = (async (url, body) => { const value = new URL(String(url), "https://fixture.invalid"); expect(value.pathname).toBe("/admin/actions/order-cases/301/telegram-url"); expect([...value.searchParams]).toEqual([["url", "https://t.me/case?x=1&y=2"]]); expect(body).toBeUndefined(); writes++; return { data: 301 }; }) as typeof authClient.put;
  authClient.post = (async (url, body) => { const value = new URL(String(url), "https://fixture.invalid"); expect(value.pathname).toBe("/admin/actions/order-cases/301/resolve"); expect([...value.searchParams]).toEqual([["outcome", "REJECTED"], ["comment", "Решение & ? = +"]]); expect(body).toBeUndefined(); writes++; return { data: null }; }) as typeof authClient.post;
  publicClient.post = async () => { throw new Error("Must not use public client"); };
  try {
    await adminOrderCasesApi.list("RESOLVED", 2, signal); await adminOrderCasesApi.detail(301, signal);
    await adminOrderCasesApi.telegram(301, "https://t.me/case?x=1&y=2"); await adminOrderCasesApi.resolve(301, { outcome: "REJECTED", comment: " Решение & ? = + " });
    await expect(adminOrderCasesApi.resolve(301, { outcome: "LEGACY" as OrderCaseResolutionOutcome, comment: "test" })).rejects.toThrow();
    await expect(adminOrderCasesApi.telegram(301, "https://t.me.evil.test/a")).rejects.toThrow();
    await expect(adminOrderCasesApi.list("OPEN", Number.MAX_SAFE_INTEGER)).rejects.toThrow();
    authClient.get = (async () => ({ data: { orderCase: { id: 999 } } })) as typeof authClient.get;
    await expect(adminOrderCasesApi.detail(301)).rejects.toThrow(); expect([reads, writes]).toEqual([2, 2]);
  } finally { Object.assign(authClient, { get: original.get, put: original.put, post: original.post }); publicClient.post = original.publicPost; }
});

test("N1 codes are distinct from generic HTTP errors; matching resolution requires state, outcome and exact comment, not order status", () => {
  const command = { caseId: 301, kind: "resolve" as const, outcome: "REJECTED" as const, comment: "Причина" };
  const detail = adminCaseFixture(301, "CANCELLATION_REQUEST"); detail.orderCase = { ...detail.orderCase, state: "RESOLVED", outcome: "REJECTED", resolutionComment: "Причина" };
  expect(matchesCaseAttempt(detail, command)).toBe(true);
  for (const patch of [{ state: "OPEN" }, { outcome: "CANCELLED" }, { resolutionComment: "Other" }, { id: 999 }]) expect(matchesCaseAttempt({ ...detail, orderCase: { ...detail.orderCase, ...patch } } as OrderCaseDetail, command)).toBe(false);
  expect(new Set(["ORDER_CASE_ALREADY_RESOLVED", "ORDER_CASE_INVALID_TRANSITION", "ORDER_CASE_INVALID_OUTCOME"].map(code => getAdminCaseFailure(new ApiError("Generic", code, 409)).message)).size).toBe(3);
  expect(getAdminCaseFailure(new ApiError("Generic conflict", "OTHER", 409)).message).toBe("Generic conflict");
});

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity }, mutations: { retry: 2 } } });
  const scope = createPrivateScope(1, () => true);
  const state = { detail: adminCaseFixture(301, "CANCELLATION_REQUEST", "AWAITING_PAYMENT"), readsFail: false, posts: 0, puts: 0, role: "ADMIN" };
  client.setQueryData(["admin", 1, "access"], { role: "ADMIN", id: 1 }); client.setQueryData(adminOrderCaseKeys.detail(1, 301), state.detail);
  const original = { detail: adminOrderCasesApi.detail, resolve: adminOrderCasesApi.resolve, telegram: adminOrderCasesApi.telegram, profile: userApi.getProfileUser };
  userApi.getProfileUser = async () => ({ id: 1, role: state.role }) as Awaited<ReturnType<typeof userApi.getProfileUser>>;
  adminOrderCasesApi.detail = async () => { if (state.readsFail) throw new Error("GET failed"); return state.detail; };
  adminOrderCasesApi.resolve = async (_, request) => { state.posts++; state.detail = { ...state.detail, orderCase: { ...state.detail.orderCase, state: "RESOLVED", outcome: request.outcome, resolutionComment: request.comment } }; };
  adminOrderCasesApi.telegram = async (_, url) => { state.puts++; state.detail = { ...state.detail, orderCase: { ...state.detail.orderCase, telegramUrl: url } }; };
  const capture = () => {
    let hook!: ReturnType<typeof useAdminCaseManagement>;
    function Probe() { hook = useAdminCaseManagement(301, 1); return null; }
    renderToString(createElement(QueryClientProvider, { client }, createElement(PrivateScopeContext.Provider, { value: scope }, createElement(Probe)))); return hook;
  };
  const begin = () => { const hook = capture(); hook.edit({ outcome: "REJECTED", comment: "Решение & ? = +", url: "https://t.me/case" }); return hook; };
  const restore = () => { Object.assign(adminOrderCasesApi, { detail: original.detail, resolve: original.resolve, telegram: original.telegram }); userApi.getProfileUser = original.profile; client.clear(); scope.dispose(); };
  return { client, scope, state, capture, begin, restore };
}

test("one shared guard survives pending remount and blocks competing Telegram/resolve; accepted write stays accepted after GET fails", async () => {
  const ctx = setup(); let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  adminOrderCasesApi.resolve = async () => { ctx.state.posts++; await gate; ctx.state.readsFail = true; };
  try {
    const pending = ctx.begin().submit("resolve"); await expect.poll(() => ctx.state.posts).toBe(1);
    await ctx.capture().submit("resolve"); await ctx.capture().submit("telegram"); expect(ctx.state.puts).toBe(0); expect(ctx.state.posts).toBe(1);
    release(); await pending; expect(ctx.capture().state.attempt).toMatchObject({ status: "accepted", checked: false });
    await ctx.capture().submit("resolve"); expect(ctx.state.posts).toBe(1);
    ctx.state.readsFail = false; ctx.state.detail.orderCase = { ...ctx.state.detail.orderCase, state: "RESOLVED", outcome: "REJECTED", resolutionComment: "Решение & ? = +" };
    await ctx.capture().checkResult(); expect(ctx.capture().state.attempt).toMatchObject({ status: "accepted", checked: true, synced: true });
  } finally { release(); ctx.restore(); }
});

for (const status of [undefined, 408, 500]) test(`unknown POST ${status}: OPEN never proves failure, later REJECTED with unchanged order status confirms without replay`, async () => {
  const ctx = setup(); adminOrderCasesApi.resolve = async () => { ctx.state.posts++; throw new ApiError("Lost", "TIMEOUT", status); };
  try {
    await ctx.begin().submit("resolve"); await ctx.capture().checkResult(); await ctx.capture().submit("resolve");
    expect(ctx.capture().state.attempt?.status).toBe("unknown"); expect(ctx.state.posts).toBe(1);
    ctx.state.detail = { ...ctx.state.detail, orderCase: { ...ctx.state.detail.orderCase, state: "RESOLVED", outcome: "REJECTED", resolutionComment: "Решение & ? = +" } };
    await ctx.capture().checkResult(); expect(ctx.capture().state.attempt?.checked).toBe(true); expect(ctx.state.detail.orderStatus).toBe("AWAITING_PAYMENT");
  } finally { ctx.restore(); }
});

test("Telegram loss compares saved URL, preserves draft through remount and unlocks subsequent resolution only after confirmation", async () => {
  const ctx = setup(); adminOrderCasesApi.telegram = async () => { ctx.state.puts++; throw new ApiError("Lost", "NETWORK_ERROR"); };
  try {
    await ctx.begin().submit("telegram"); await ctx.capture().submit("resolve"); expect(ctx.state.posts).toBe(0);
    expect(ctx.capture().state).toMatchObject({ url: "https://t.me/case", comment: "Решение & ? = +" });
    ctx.state.detail.orderCase!.telegramUrl = "https://t.me/case"; await ctx.capture().checkResult();
    ctx.capture().continueAfterTelegram(); await ctx.capture().submit("resolve"); expect(ctx.state.posts).toBe(1); expect(ctx.state.puts).toBe(1);
  } finally { ctx.restore(); }
});

test("ALREADY_RESOLVED never unlocks either command even if a lagging GET still returns OPEN", async () => {
  const ctx = setup();
  adminOrderCasesApi.telegram = async () => { ctx.state.puts++; throw new ApiError("Resolved", "ORDER_CASE_ALREADY_RESOLVED", 409); };
  try {
    await ctx.begin().submit("telegram"); await ctx.capture().checkResult(); await ctx.capture().submit("resolve"); await ctx.capture().submit("telegram");
    expect(ctx.capture().state.attempt).toMatchObject({ status: "rejected", terminal: true });
    expect(ctx.state.puts).toBe(1); expect(ctx.state.posts).toBe(0);
  } finally { ctx.restore(); }
});

test("Telegram preflight detects a newer saved baseline and preserves dirty URL until explicit review; an equal URL never repeats PUT", async () => {
  const ctx = setup();
  try {
    ctx.begin(); ctx.state.detail.orderCase!.telegramUrl = "https://t.me/newer";
    await ctx.capture().submit("telegram"); expect(ctx.state.puts).toBe(0);
    expect(ctx.capture().state).toMatchObject({ baselineUrl: "https://t.me/newer", url: "https://t.me/case" });
    await ctx.capture().submit("telegram"); expect(ctx.state.puts).toBe(1);
    ctx.capture().continueAfterTelegram(); await ctx.capture().submit("telegram"); expect(ctx.state.puts).toBe(1);
  } finally { ctx.restore(); }
});

test("fresh preflight rejects stale policy, changed case context and revoked/failed ADMIN access without a POST", async () => {
  const ctx = setup();
  try {
    ctx.begin(); ctx.state.detail.orderCase!.state = "RESOLVED"; await ctx.capture().submit("resolve"); expect(ctx.state.posts).toBe(0);
    ctx.state.detail = adminCaseFixture(301, "DISPUTE", "ASSEMBLING"); await ctx.capture().submit("resolve"); expect(ctx.state.posts).toBe(0);
    ctx.state.detail = adminCaseFixture(301, "CANCELLATION_REQUEST", "AWAITING_PAYMENT"); ctx.state.role = "USER";
    await ctx.capture().submit("resolve"); expect(ctx.state.posts).toBe(0);
    ctx.client.setQueryData(["admin", 1, "access"], { role: "ADMIN" }); userApi.getProfileUser = async () => { throw new Error("Profile unavailable"); };
    await ctx.capture().submit("resolve"); expect(ctx.state.posts).toBe(0); expect(ctx.capture().state.comment).toBe("Решение & ? = +");
  } finally { ctx.restore(); }
});

test("known rejection stays locked after failed control GET, then permits only an explicit retry; competing decision retains original input", async () => {
  const ctx = setup(); adminOrderCasesApi.resolve = async () => { ctx.state.posts++; ctx.state.readsFail = true; throw new ApiError("Invalid", "ORDER_CASE_INVALID_OUTCOME", 400); };
  try {
    await ctx.begin().submit("resolve"); expect(ctx.capture().state.attempt?.status).toBe("rejected"); await ctx.capture().submit("resolve"); expect(ctx.state.posts).toBe(1);
    ctx.state.readsFail = false; await ctx.capture().checkResult(); expect(ctx.capture().state.attempt).toBeNull();
    adminOrderCasesApi.resolve = async () => { ctx.state.posts++; ctx.state.detail.orderCase = { ...ctx.state.detail.orderCase, state: "RESOLVED", outcome: "CANCELLED", resolutionComment: "Other admin" }; throw new ApiError("Conflict", "ORDER_CASE_ALREADY_RESOLVED", 409); };
    await ctx.capture().submit("resolve"); expect(ctx.capture().state).toMatchObject({ comment: "Решение & ? = +", attempt: { status: "conflict", checked: true } }); expect(ctx.state.posts).toBe(2);
  } finally { ctx.restore(); }
});

test("resolution refreshes both queues, cached admin/buyer/seller orders and this case history; late old GET cannot overwrite and unrelated data stays fresh", async () => {
  const ctx = setup(); const calls: string[] = [];
  const keys = [adminOrderCaseKeys.list(1, "OPEN", 0), adminOrderCaseKeys.list(1, "RESOLVED", 0), adminOrderKeys.list(1, { page: 0 }), ctx.scope.key(orderQueryKeys.customerOrders()), ctx.scope.key(orderQueryKeys.sellerOrders()), ctx.scope.key(orderQueryKeys.cases(201))];
  const unrelated = [["catalog"], adminOrderCaseKeys.list(2, "OPEN", 0), ctx.scope.key(orderQueryKeys.cases(202))];
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  try {
    for (const key of [...keys, ...unrelated]) await ctx.client.fetchQuery({ queryKey: key, queryFn: async () => { calls.push(JSON.stringify(key)); return { fresh: ctx.state.detail.orderCase?.state }; } });
    let first = true;
    const late = ctx.client.fetchQuery({ queryKey: keys[0], staleTime: 0, queryFn: async () => {
      calls.push(JSON.stringify(keys[0]));
      if (first) { first = false; await gate; return { fresh: "OPEN" }; }
      return { fresh: ctx.state.detail.orderCase?.state };
    } }).catch(() => undefined);
    calls.length = 0; await ctx.begin().submit("resolve"); release(); await late;
    expect(new Set(calls)).toEqual(new Set(keys.map(key => JSON.stringify(key))));
    for (const key of keys) expect(ctx.client.getQueryData(key)).toEqual({ fresh: "RESOLVED" });
    for (const key of unrelated) expect(ctx.client.getQueryState(key)?.isInvalidated).toBe(false);
  } finally { release(); ctx.restore(); }
});

test("refresh keeps draft; account teardown discards all private/admin state and late POST cannot recreate it", async () => {
  const ctx = setup(); const auth = useAuthStore.getState(); useAuthStore.setState({ isInitialized: true, isAuthenticated: true, accountRevision: 1 });
  const unbind = bindPrivateDataLifecycle(ctx.client, ctx.scope, () => {}, () => {});
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  adminOrderCasesApi.resolve = async () => { ctx.state.posts++; await gate; };
  try {
    const pending = ctx.begin().submit("resolve"); await expect.poll(() => ctx.state.posts).toBe(1);
    useAuthStore.setState({ sessionRevision: auth.sessionRevision + 1 }); expect(ctx.capture().state.comment).toBe("Решение & ? = +");
    useAuthStore.setState({ accountRevision: 2 }); release(); await pending; expect(ctx.client.getQueryCache().getAll()).toEqual([]);
  } finally { release(); unbind(); ctx.restore(); useAuthStore.setState(auth, true); }
});

test("offline does not queue POST for a later reconnect", async () => {
  const ctx = setup(); const online = onlineManager.isOnline(); adminOrderCasesApi.resolve = async () => { ctx.state.posts++; throw new ApiError("Offline", "NETWORK_ERROR"); };
  try { const hook = ctx.begin(); onlineManager.setOnline(false); await hook.submit("resolve"); expect(ctx.capture().state.busy).toBe(false); onlineManager.setOnline(true); await ctx.capture().submit("resolve"); expect(ctx.state.posts).toBe(1); }
  finally { onlineManager.setOnline(online); ctx.restore(); }
});

for (const unknown of [false, true]) test(`settled Telegram accepted=${!unknown} keeps its own replay guard while OPEN/B permits independent resolve`, async () => {
  const ctx = setup();
  adminOrderCasesApi.telegram = async (_, url) => {
    ctx.state.puts++; ctx.state.readsFail = true;
    ctx.state.detail = { ...ctx.state.detail, orderCase: { ...ctx.state.detail.orderCase, telegramUrl: url } };
    if (unknown) throw new ApiError("Lost", "NETWORK_ERROR");
  };
  try {
    await ctx.begin().submit("telegram");
    ctx.capture().continueAfterTelegram(); await ctx.capture().submit("resolve"); expect(ctx.state.posts).toBe(0);
    ctx.state.readsFail = false; ctx.state.detail.orderCase!.telegramUrl = "https://t.me/newer_B";
    await ctx.capture().checkResult();
    expect(ctx.capture().state.attempt).toMatchObject({ status: unknown ? "unknown" : "accepted", checked: false, openChecked: true, synced: true });
    ctx.capture().continueAfterTelegram();
    expect(ctx.capture().state.telegramAttempt).toMatchObject({ url: "https://t.me/case", status: unknown ? "unknown" : "accepted", checked: false });
    await ctx.capture().submit("telegram"); expect(ctx.state.puts).toBe(1);
    await ctx.capture().submit("resolve"); expect(ctx.state.posts).toBe(1);
    expect(ctx.state.detail.orderCase!.telegramUrl).toBe("https://t.me/newer_B");
  } finally { ctx.restore(); }
});

test("late Telegram PUT after account teardown cannot restore a guard or permit a resolve in the next scope", async () => {
  const ctx = setup(); const auth = useAuthStore.getState(); useAuthStore.setState({ isInitialized: true, isAuthenticated: true, accountRevision: 1 });
  const unbind = bindPrivateDataLifecycle(ctx.client, ctx.scope, () => {}, () => {});
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  adminOrderCasesApi.telegram = async () => { ctx.state.puts++; await gate; };
  try {
    const pending = ctx.begin().submit("telegram"); await expect.poll(() => ctx.state.puts).toBe(1);
    const old = ctx.capture(); useAuthStore.setState({ accountRevision: 2 }); release(); await pending;
    old.continueAfterTelegram(); await old.submit("resolve");
    expect(ctx.state.posts).toBe(0); expect(ctx.client.getQueryCache().getAll()).toEqual([]);
  } finally { release(); unbind(); ctx.restore(); useAuthStore.setState(auth, true); }
});
