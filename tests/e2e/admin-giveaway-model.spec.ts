import { expect, test } from "@playwright/test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { IsRestoringProvider, QueryClient, QueryClientProvider, QueryObserver, type QueryKey } from "@tanstack/react-query";
import {
  adminGiveawayApi, adminGiveawayKeys, adminProductKeys, giveawayKeys, giveawaySettingsFingerprint,
  mapGiveawaySettings, productKeys, synchronizeGiveaway, toGiveawaySettingsRequest, validateGiveawaySettings,
} from "@/entities/product";
import { agentApi, agentKeys } from "@/entities/agent";
import { userApi } from "@/entities/user";
import { authClient, publicClient } from "@/shared/api";
import { createPrivateScope, PrivateScopeContext } from "@/shared/lib/query";
import { ApiError } from "@/shared/lib/errorHandler";
import { useAdminGiveawayManagement } from "@/features/admin-giveaway-management/model/useAdminGiveawayManagement";
import { adminGiveawayFixture, deferred } from "./helpers/adminGiveaway";

const futureProduct = () => adminGiveawayFixture(8101, {
  giveawayStartAt: new Date(Date.now() + 60_000).toISOString(), giveawayEndAt: new Date(Date.now() + 86_400_000).toISOString(),
});

test("settings validation and timezone mapping preserve seven fields, disabled past end and strict boundaries", () => {
  const values = mapGiveawaySettings(adminGiveawayFixture(8101, { giveawayEnabled: false }));
  expect(Object.keys(toGiveawaySettingsRequest(values)).sort()).toEqual(["enabled", "telegramUrl", "startAt", "endAt", "winnersCount", "rules", "homeText"].sort());
  expect(toGiveawaySettingsRequest(values).startAt).toBe("2027-06-01T12:00:00.000Z");
  expect(giveawaySettingsFingerprint(values)).toBe(giveawaySettingsFingerprint({ ...values, startAt: "2027-06-01T12:00:00Z" }));
  const ended = { ...values, enabled: false, startAt: "2020-01-01T00:00:00Z", endAt: "2020-01-02T00:00:00Z" };
  expect(validateGiveawaySettings(ended)).toEqual({}); expect(validateGiveawaySettings({ ...ended, enabled: true }, Date.parse("2027-06-01T12:00:00Z")).endAt).toBeTruthy();
  const end = Date.parse(values.endAt);
  expect(validateGiveawaySettings({ ...values, enabled: true }, end - 1)).toEqual({});
  expect(validateGiveawaySettings({ ...values, enabled: true }, end).endAt).toBeTruthy();
  expect(validateGiveawaySettings({ ...values, endAt: values.startAt }).endAt).toBeTruthy();
  for (const patch of [{ startAt: "2027-02-30T00:00:00Z" }, { startAt: "2027-06-01T12:00:00" }, { winnersCount: 0 }, { winnersCount: 1.5 }, { rules: " " }, { homeText: " " }, { telegramUrl: "https://t.me/" }]) expect(Object.keys(validateGiveawaySettings({ ...values, ...patch })).length).toBeGreaterThan(0);
});

test("admin transport uses auth, fixed pagination, direct settings and signal; 404 is an error", async () => {
  const original = { get: authClient.get, put: authClient.put, publicGet: publicClient.get };
  const calls: unknown[][] = [], signal = new AbortController().signal;
  const product = adminGiveawayFixture(); let data: unknown = [product]; let failure: unknown;
  authClient.get = (async (...args: unknown[]) => { calls.push(args); if (failure) throw failure; return { data }; }) as typeof authClient.get;
  authClient.put = (async (...args: unknown[]) => { calls.push(args); return {}; }) as typeof authClient.put;
  publicClient.get = async () => { throw new Error("Public admin request"); };
  try {
    expect(await adminGiveawayApi.history(2, signal)).toEqual([product]);
    data = { product, imageIds: [], categories: [] }; expect(await adminGiveawayApi.detail(8101, signal)).toEqual(data);
    const settings = toGiveawaySettingsRequest({ ...mapGiveawaySettings(product), enabled: false }); await adminGiveawayApi.update(8101, settings);
    expect(calls).toEqual([["/admin/actions/giveaways/history", { params: { page: 2, size: 50 }, signal }], ["/admin/actions/giveaways/8101", { signal }], ["/admin/actions/giveaways/8101", settings]]);
    failure = new ApiError("absent", undefined, 404); await expect(adminGiveawayApi.detail(8101)).rejects.toBe(failure);
    failure = undefined; data = { product: { ...product, id: 8102 } }; await expect(adminGiveawayApi.detail(8101)).rejects.toThrow("Некорректные данные");
    await expect(adminGiveawayApi.detail(0)).rejects.toThrow("Некорректный ID");
  } finally { authClient.get = original.get; authClient.put = original.put; publicClient.get = original.publicGet; }
});

for (const own of [false, true]) test(`targeted sync own=${own}: active refetch, inactive invalidation, relations cancel-only, unrelated caches untouched`, async () => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: 600_000, retry: false } } });
  const scope = createPrivateScope(1, () => true), calls: string[] = [], unbind: (() => void)[] = [];
  const targets: QueryKey[] = [adminGiveawayKeys.history(1, 0), adminGiveawayKeys.history(1, 2), adminGiveawayKeys.detail(1, 8101), giveawayKeys.active(), giveawayKeys.detail(8101), adminProductKeys.detail(1, 8101),
    ...(own ? [scope.key(productKeys.userList()), scope.key(productKeys.userList({ size: 5 }))] : [adminProductKeys.list(1, 2)])];
  const relations = adminProductKeys.relations(1, 8101);
  const foreign: QueryKey[] = [adminGiveawayKeys.history(2, 0), adminGiveawayKeys.detail(1, 999), adminProductKeys.detail(1, 999), adminProductKeys.list(1, 3), adminProductKeys.list(2, 2), giveawayKeys.detail(999), ["imageMetadata", 77], ["private", 2, ...productKeys.userLists()],
    ...(own ? [adminProductKeys.list(1, 2)] : [scope.key(productKeys.userLists())])];
  const active = targets.filter((_, index) => index % 2 === 0);
  try {
    for (const key of [...targets, relations, ...foreign]) {
      client.setQueryDefaults(key, { queryFn: async () => { calls.push(JSON.stringify(key)); return "fresh"; } });
      client.setQueryData(key, "old");
      if (active.includes(key) || key === relations || foreign.includes(key)) {
        const observer = new QueryObserver(client, { queryKey: key }); unbind.push(observer.subscribe(() => {}));
      }
    }
    await synchronizeGiveaway(client, { session: 1, productId: 8101, agentId: own ? undefined : 2, ownedByCurrentUser: own, scope, isCurrent: () => true });
    expect(calls.sort()).toEqual(active.map(key => JSON.stringify(key)).sort());
    for (const key of targets) {
      expect(client.getQueryData(key)).toBe(active.includes(key) ? "fresh" : "old");
      expect(client.getQueryState(key)?.isInvalidated).toBe(!active.includes(key));
    }
    expect(client.getQueryState(relations)?.isInvalidated).toBe(true);
    for (const key of foreign) { expect(client.getQueryData(key)).toBe("old"); expect(client.getQueryState(key)?.isInvalidated).toBe(false); }
  } finally { unbind.forEach(stop => stop()); scope.dispose(); client.clear(); }
});

test("cancel old detail and relations before refetch; late responses cannot restore previous snapshot; ended scope cannot synchronize", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: 600_000, retry: false } } }), scope = createPrivateScope(1, () => true);
  const key = adminGiveawayKeys.detail(1, 8101), relations = adminProductKeys.relations(1, 8101), gate = deferred();
  const signals: AbortSignal[] = []; let first = true;
  client.setQueryDefaults(key, { queryFn: async ({ signal }) => { signals.push(signal); if (first) { first = false; await gate.promise; return "late"; } return "fresh"; } });
  client.setQueryDefaults(relations, { queryFn: async ({ signal }) => { signals.push(signal); await gate.promise; return "late relations"; } });
  client.setQueryData(key, "old"); client.setQueryData(relations, "old relations");
  const stop = new QueryObserver(client, { queryKey: key }).subscribe(() => {});
  try {
    const old = client.fetchQuery({ queryKey: key, staleTime: 0 }).catch(() => {}), oldRelations = client.fetchQuery({ queryKey: relations, staleTime: 0 }).catch(() => {});
    await expect.poll(() => signals.length).toBe(2);
    await synchronizeGiveaway(client, { session: 1, productId: 8101, ownedByCurrentUser: false, scope, isCurrent: () => true });
    expect(signals.slice(0, 2).every(signal => signal.aborted)).toBe(true);
    gate.resolve(); await Promise.all([old, oldRelations]);
    expect(client.getQueryData(key)).toBe("fresh"); expect(client.getQueryData(relations)).toBe("old relations");
    scope.dispose(); await expect(synchronizeGiveaway(client, { session: 1, productId: 8101, ownedByCurrentUser: false, scope, isCurrent: () => true })).rejects.toThrow("Сессия");
  } finally { gate.resolve(); stop(); client.clear(); }
});

for (const mode of ["accepted-read-error", "accepted-sync-error", "accepted-owner-error", "unknown-sync-error", "unknown-applied", "unknown-unapplied", "timeout-unapplied", "revoked", "late-scope"] as const) test(`real operation hook ${mode}: persistent guard, no duplicate PUT and scoped recovery`, async () => {
  const original = { detail: adminGiveawayApi.detail, update: adminGiveawayApi.update, profile: userApi.getProfileUser, agents: agentApi.list };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 600_000 } } }), scope = createPrivateScope(1, () => true);
  const product = futureProduct(), values = mapGiveawaySettings(product), edited = { ...values, rules: "Новый текст" };
  const key = ["admin", 1, "giveaway-operation", 8101]; let writes = 0, failRead = false, failSync = mode === "accepted-sync-error" || mode === "unknown-sync-error"; const gate = deferred();
  let failOwner = mode === "accepted-owner-error";
  client.setQueryDefaults(giveawayKeys.active(), { queryFn: async () => { if (failSync) throw new Error("Active GET failed"); return null; } });
  client.setQueryData(giveawayKeys.active(), null);
  const stop = new QueryObserver(client, { queryKey: giveawayKeys.active() }).subscribe(() => {});
  const profile = { id: 1, role: "ADMIN" } as Awaited<ReturnType<typeof userApi.getProfileUser>>;
  client.setQueryData(["admin", 1, "access"], profile);
  client.setQueryData(adminGiveawayKeys.detail(1, 8101), { product });
  client.setQueryData(agentKeys.list(1), [{ id: 2, login: "bot", status: "ACTIVE" }]);
  client.setQueryData(adminProductKeys.list(1, 2), "old");
  client.setQueryData(key, { values: edited, baseline: giveawaySettingsFingerprint(values), initialized: true, revision: 1, busy: false, attempt: null, message: "", conflict: false, readFailed: false, overlap: false });
  adminGiveawayApi.detail = async () => { if (failRead) throw new Error("GET unavailable"); return { product: { ...product } }; };
  userApi.getProfileUser = async () => mode === "revoked" ? { ...profile, role: "USER" } : profile;
  agentApi.list = async () => { if (failOwner) throw new Error("Agents GET failed"); return [{ id: 2, login: "bot", status: "ACTIVE" }]; };
  adminGiveawayApi.update = async () => {
    writes++; if (mode === "late-scope") await gate.promise;
    if (mode !== "unknown-unapplied" && mode !== "timeout-unapplied") product.giveawayRules = edited.rules;
    if (mode === "accepted-read-error") failRead = true;
    if (mode.startsWith("unknown")) throw new ApiError("Lost response", "NETWORK_ERROR");
    if (mode === "timeout-unapplied") throw new ApiError("Request timeout", "REQUEST_TIMEOUT", 408);
  };
  let hook!: ReturnType<typeof useAdminGiveawayManagement>;
  function Probe() { hook = useAdminGiveawayManagement(1, 8101); return null; }
  // SSR не выполняет mount/refetch effects. Отключаем лишь оптимистический fetching render;
  // сами read/save/recovery ниже вызывают настоящие query/mutation функции.
  const render = () => renderToString(createElement(QueryClientProvider, { client }, createElement(IsRestoringProvider, { value: true }, createElement(PrivateScopeContext.Provider, { value: scope }, createElement(Probe)))));
  try {
    render(); const pending = hook.save();
    if (mode === "late-scope") {
      await expect.poll(() => writes).toBe(1); scope.dispose(); client.removeQueries({ queryKey: ["admin", 1] }); gate.resolve(); await pending;
      expect(client.getQueryData(key)).toBeUndefined(); return;
    }
    await pending; render();
    if (mode === "revoked") { expect(writes).toBe(0); await hook.save(); expect(writes).toBe(0); return; }
    expect(writes).toBe(1);
    if (mode === "accepted-read-error" || mode === "accepted-sync-error" || mode === "accepted-owner-error" || mode === "unknown-sync-error" || mode === "unknown-unapplied" || mode === "timeout-unapplied") {
      expect(client.getQueryData<{ attempt: unknown }>(key)?.attempt).not.toBeNull();
      if (mode === "accepted-owner-error") expect(client.getQueryState(adminProductKeys.list(1, 2))?.isInvalidated).toBe(true);
      if (mode === "unknown-sync-error") expect(client.getQueryData<{ attempt: { status: string } }>(key)?.attempt.status).toBe("accepted");
      await hook.save(); expect(writes).toBe(1);
      render(); await hook.save(); expect(writes).toBe(1);
      failRead = false; failSync = false; failOwner = false; product.giveawayRules = edited.rules; await hook.check();
    }
    expect(client.getQueryData<{ attempt: unknown }>(key)?.attempt).toBeNull();
    expect(client.getQueryData<{ values: unknown }>(key)?.values).toEqual(mapGiveawaySettings(product)); expect(writes).toBe(1);
  } finally { gate.resolve(); stop(); scope.dispose(); client.clear(); Object.assign(adminGiveawayApi, { detail: original.detail, update: original.update }); userApi.getProfileUser = original.profile; agentApi.list = original.agents; }
});

test("accepted write invalidates related inactive caches even when first control GET fails", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: 600_000, retry: false } } });
  const scope = createPrivateScope(1, () => true), product = futureProduct(), values = mapGiveawaySettings(product);
  const original = { detail: adminGiveawayApi.detail, profile: userApi.getProfileUser, agents: agentApi.list };
  const key = ["admin", 1, "giveaway-operation", 8101];
  const related = [adminGiveawayKeys.history(1, 3), adminProductKeys.detail(1, 8101), adminProductKeys.relations(1, 8101), adminProductKeys.list(1, 2), giveawayKeys.active(), giveawayKeys.detail(8101)];
  client.setQueryData(["admin", 1, "access"], { id: 1, role: "ADMIN" });
  client.setQueryData(adminGiveawayKeys.detail(1, 8101), { product });
  related.forEach(queryKey => client.setQueryData(queryKey, "old"));
  client.setQueryData(key, { values, baseline: giveawaySettingsFingerprint(values), initialized: true, revision: 1, busy: false, attempt: { values, status: "accepted" }, message: "", conflict: false, readFailed: true, overlap: false });
  userApi.getProfileUser = async () => ({ id: 1, role: "ADMIN" }) as Awaited<ReturnType<typeof userApi.getProfileUser>>;
  agentApi.list = async () => [{ id: 2, login: "bot", status: "ACTIVE" }];
  adminGiveawayApi.detail = async () => { throw new Error("Control GET fails"); };
  let hook!: ReturnType<typeof useAdminGiveawayManagement>;
  function Probe() { hook = useAdminGiveawayManagement(1, 8101); return null; }
  try {
    renderToString(createElement(QueryClientProvider, { client }, createElement(IsRestoringProvider, { value: true }, createElement(PrivateScopeContext.Provider, { value: scope }, createElement(Probe)))));
    await hook.check();
    for (const queryKey of related) expect(client.getQueryState(queryKey)?.isInvalidated).toBe(true);
    expect(client.getQueryData<{ readFailed: boolean; attempt: { status: string } }>(key)).toMatchObject({ readFailed: true, attempt: { status: "accepted" } });
  } finally { scope.dispose(); client.clear(); adminGiveawayApi.detail = original.detail; userApi.getProfileUser = original.profile; agentApi.list = original.agents; }
});
