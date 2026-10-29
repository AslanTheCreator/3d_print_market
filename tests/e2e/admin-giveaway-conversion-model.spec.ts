import { expect, test } from "@playwright/test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { IsRestoringProvider, QueryClient, QueryClientProvider, QueryObserver, type QueryKey } from "@tanstack/react-query";
import { adminGiveawayApi, adminGiveawayKeys, adminProductApi, adminProductKeys, adminProductOperationKeys,
  adminProductBaseline, adminProductInputFingerprint, adminProductMatchesInput, giveawayProductRelations, giveawayKeys,
  mapAdminProductToInput, mapGiveawaySettings, mergeAdminProduct, productKeys, synchronizeGiveaway, toAdminProductRequest,
  type AdminProductDto, type AdminProductEditorData, type AdminProductInput } from "@/entities/product";
import { agentApi, agentKeys } from "@/entities/agent";
import { userApi } from "@/entities/user";
import { authClient, publicClient } from "@/shared/api";
import { ApiError } from "@/shared/lib/errorHandler";
import { createPrivateScope, PrivateScopeContext } from "@/shared/lib/query";
import { useAdminProductManagement, type AdminProductDraft } from "@/features/admin-product-management/model/useAdminProductManagement";
import { useAdminGiveawayManagement } from "@/features/admin-giveaway-management/model/useAdminGiveawayManagement";
import { adminGiveawayFixture, deferred } from "./helpers/adminGiveaway";
import { adminProductFixture } from "./helpers/admin";

const future = (): AdminProductDto => adminGiveawayFixture(101, { used: true, giveawayStartAt: new Date(Date.now() + 60_000).toISOString(), giveawayEndAt: new Date(Date.now() + 86_400_000).toISOString() }) as AdminProductDto;
const data = (product: AdminProductDto): AdminProductEditorData => ({ product: structuredClone(product), categoryIds: [1, 2], imageIds: [77, 78] });
const seeded = (initial: AdminProductEditorData, values: AdminProductInput = mapAdminProductToInput(initial)): AdminProductDraft => ({ values, baseline: adminProductBaseline(initial), revision: 1, busy: false, attempt: null, message: "", conflict: false, readFailed: false, overlap: false, restorePending: false });

test("admin union and transport preserve external null/zero, nested giveaway and every source relationship without seller conversion", async () => {
  const original = authClient.put, calls: unknown[] = [];
  authClient.put = (async (...args: unknown[]) => { calls.push(args); return { data: null }; }) as typeof authClient.put;
  try {
    const zero = mapAdminProductToInput(data(adminProductFixture() as AdminProductDto));
    const unlimited = { ...zero, count: null };
    await adminProductApi.update(2, 101, zero); await adminProductApi.update(2, 101, unlimited);
    const converted: AdminProductInput = { ...zero, availability: "GIVEAWAY", used: true, giveaway: mapGiveawaySettings(future()) };
    await adminProductApi.update(2, 101, converted);
    const { count: _count, prepaymentAmount: _prepayment, ...giveawayBody } = converted;
    expect(calls).toEqual([["/admin/actions/agents/2/products/101", { ...zero }], ["/admin/actions/agents/2/products/101", { ...unlimited }], ["/admin/actions/agents/2/products/101", giveawayBody]]);
    expect(giveawayBody).not.toHaveProperty("count"); expect(giveawayBody).not.toHaveProperty("prepaymentAmount");
    expect(adminProductInputFingerprint(zero)).not.toBe(adminProductInputFingerprint(unlimited));
    expect(mapAdminProductToInput(data(future())).availability).toBe("GIVEAWAY");
    const optional = { ...converted, used: undefined };
    const observed = data({ ...future(), ...zero, availability: "GIVEAWAY", used: false,
      giveawayStartAt: converted.giveaway.startAt, giveawayEndAt: converted.giveaway.endAt });
    expect(adminProductMatchesInput(observed, optional)).toBe(true);
    expect(adminProductMatchesInput(observed, { ...converted, used: true })).toBe(false);
  } finally { authClient.put = original; }
});

test("giveaway relationships use one complete administrative snapshot, never public GET or mixed product fields", async () => {
  const original = { detail: adminGiveawayApi.detail, get: publicClient.get };
  const product = future(); let reads = 0;
  let response = { product, categories: [{ id: 2 }], imageIds: [78] };
  adminGiveawayApi.detail = async () => { reads++; return response; };
  publicClient.get = async () => { throw new Error("Public GIVEAWAY read"); };
  try {
    const relations = await adminProductApi.relations(101, undefined, true);
    expect(mergeAdminProduct({ ...product, name: "Older core snapshot", giveawayRules: "Older rules" }, relations)).toEqual({ product, categoryIds: [2], imageIds: [78] });
    for (const patch of [{ imageIds: undefined }, { categories: undefined }, { imageIds: [-1] }, { product: { ...product, giveawayEnabled: undefined } }]) {
      response = { product, categories: [{ id: 2 }], imageIds: [78], ...patch } as typeof response;
      await expect(adminProductApi.relations(101, undefined, true)).rejects.toThrow("не подтверждены");
    }
    expect(reads).toBe(5);
    expect(() => mergeAdminProduct({ ...product, participantId: 3 }, relations)).toThrow("не подтверждены");
  } finally { adminGiveawayApi.detail = original.detail; publicClient.get = original.get; }
});

for (const converted of [false, true]) test(`giveaway sync converted=${converted}: active relations refreshed, late old read cancelled, only conversion drops normal detail and catalog`, async () => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: 600_000, retry: false } } }), scope = createPrivateScope(1, () => true);
  const relations = adminProductKeys.relations(1, 101), catalog = productKeys.list({ size: 20 }), detail = productKeys.detail(101), gate = deferred();
  let first = true; const signals: AbortSignal[] = [], calls: string[] = [], stops: (() => void)[] = [];
  const affected: QueryKey[] = [relations, adminProductKeys.detail(1, 101), adminProductKeys.list(1, 2), adminGiveawayKeys.detail(1, 101), adminGiveawayKeys.history(1, 0), giveawayKeys.detail(101), giveawayKeys.active()];
  const foreign: QueryKey[] = [adminProductKeys.list(1, 3), adminProductKeys.detail(1, 102), adminProductKeys.relations(2, 101), adminGiveawayKeys.detail(1, 102), ["imageMetadata", 77]];
  for (const key of [...affected, catalog, detail, ...foreign]) {
    client.setQueryDefaults(key, { queryFn: async () => { calls.push(JSON.stringify(key)); return "fresh"; } }); client.setQueryData(key, "old");
    if (key !== detail) stops.push(new QueryObserver(client, { queryKey: key }).subscribe(() => {}));
  }
  client.setQueryData(productKeys.detail("101"), "old string detail");
  const inactive = adminGiveawayKeys.history(1, 1); client.setQueryData(inactive, "old page");
  client.setQueryDefaults(relations, { queryFn: async ({ signal }) => { signals.push(signal); if (first) { first = false; await gate.promise; return "old public result"; } calls.push(JSON.stringify(relations)); return "fresh admin result"; } });
  try {
    const old = client.fetchQuery({ queryKey: relations, staleTime: 0 }).catch(() => {}); await expect.poll(() => signals.length).toBe(1);
    const wrongScope = createPrivateScope(2, () => true);
    try {
      await expect(synchronizeGiveaway(client, { session: 1, productId: 101, agentId: 2, ownedByCurrentUser: false, scope: wrongScope, isCurrent: () => true, converted })).rejects.toThrow("Сессия");
      expect(client.getQueryData(detail)).toBe("old"); expect(signals[0].aborted).toBe(false); expect(calls).toEqual([]);
    } finally { wrongScope.dispose(); }
    await synchronizeGiveaway(client, { session: 1, productId: 101, agentId: 2, ownedByCurrentUser: false, scope, isCurrent: () => true, converted });
    expect(signals[0].aborted).toBe(true); gate.resolve(); await old;
    expect(client.getQueryData(relations)).toBe("fresh admin result");
    expect(calls.sort()).toEqual([...affected, ...(converted ? [catalog] : [])].map(key => JSON.stringify(key)).sort());
    expect(client.getQueryData(detail)).toBe(converted ? undefined : "old"); expect(client.getQueryData(productKeys.detail("101"))).toBe(converted ? undefined : "old string detail");
    expect(client.getQueryState(inactive)?.isInvalidated).toBe(true);
    for (const key of foreign) { expect(client.getQueryData(key)).toBe("old"); expect(client.getQueryState(key)?.isInvalidated).toBe(false); }
  } finally { gate.resolve(); stops.forEach(stop => stop()); scope.dispose(); client.clear(); }
});

for (const mode of ["success", "unknown-applied", "unknown-used", "unknown-unapplied", "408", "overlap", "read-error", "sync-error", "role", "owner", "conflict", "late-scope", "pending-remount", "settings-pending", "status-pending"] as const) test(`product operation ${mode}: Safety, Progress, Persistence and shared editor guard`, async () => {
  const original = { get: adminProductApi.get, relations: adminProductApi.relations, update: adminProductApi.update, profile: userApi.getProfileUser, agents: agentApi.list, detail: adminGiveawayApi.detail };
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: 600_000, retry: false } } }), scope = createPrivateScope(1, () => true), gate = deferred();
  let product = mode === "pending-remount" ? future() : adminProductFixture() as AdminProductDto;
  const initial = data(product), key = adminProductOperationKeys.product(1, 101);
  const values: AdminProductInput = { ...mapAdminProductToInput(initial), availability: "GIVEAWAY", giveaway: mapGiveawaySettings(future()) };
  let writes = 0, failedRead = false, failedSync = false;
  const profile = { id: 1, role: "ADMIN" } as Awaited<ReturnType<typeof userApi.getProfileUser>>;
  client.setQueryData(["admin", 1, "access"], profile); client.setQueryData(key, seeded(initial, values));
  client.setQueryData(adminProductKeys.detail(1, 101), product);
  userApi.getProfileUser = async () => mode === "role" ? { ...profile, role: "USER" } : profile;
  agentApi.list = async () => [{ id: 2, login: "bot-two", status: "ACTIVE" }];
  adminProductApi.get = async () => { if (failedRead) throw new Error("Control GET down"); return { ...product, ...(mode === "owner" ? { participantId: 99 } : {}), ...(mode === "conflict" ? { description: "Remote change" } : {}) }; };
  adminProductApi.relations = async (_id, _signal, giveaway) => {
    if (giveaway) return giveawayProductRelations({ product: structuredClone(product), categories: [{ id: 1 }, { id: 2 }], imageIds: [77, 78] });
    return { ...structuredClone(product), categories: [{ id: 1 }, { id: 2 }], imageIds: [77, 78] };
  };
  adminGiveawayApi.detail = async () => ({ product, categories: [{ id: 1 }, { id: 2 }], imageIds: [77, 78] });
  adminProductApi.update = async (_owner, _id, input) => {
    writes++; if (mode === "pending-remount" || mode === "late-scope") await gate.promise;
    if (mode === "overlap") throw new ApiError("Overlap", "GIVEAWAY_WINDOW_OVERLAP", 400);
    if (mode === "unknown-unapplied" || mode === "408") throw new ApiError("Lost", "NETWORK_ERROR", mode === "408" ? 408 : undefined);
    const body = toAdminProductRequest(input); product = { ...product, ...body };
    if (input.availability === "GIVEAWAY") Object.assign(product, {
      giveawayRules: input.giveaway.rules, giveawayHomeText: input.giveaway.homeText, giveawayTelegramUrl: input.giveaway.telegramUrl,
      giveawayEnabled: input.giveaway.enabled, giveawayStartAt: input.giveaway.startAt, giveawayEndAt: input.giveaway.endAt, giveawayWinnersCount: input.giveaway.winnersCount, count: null, prepaymentAmount: null,
    });
    if (mode === "read-error") failedRead = true; if (mode === "sync-error") failedSync = true;
    if (mode === "unknown-used") product.used = false;
    if (mode === "unknown-applied" || mode === "unknown-used") throw new ApiError("Lost", "NETWORK_ERROR");
  };
  const listKey = adminProductKeys.list(1, 2);
  client.setQueryDefaults(listKey, { queryFn: async () => { if (failedSync) throw new Error("List down"); return [product]; } }); client.setQueryData(listKey, [product]);
  const stop = new QueryObserver(client, { queryKey: listKey }).subscribe(() => {});
  let hook!: ReturnType<typeof useAdminProductManagement>, settings!: ReturnType<typeof useAdminGiveawayManagement>;
  function ProductProbe() { hook = useAdminProductManagement(1, 101, initial, true); return null; }
  function SettingsProbe() { settings = useAdminGiveawayManagement(1, 101); return null; }
  const render = (editor: "product" | "settings" = "product") => renderToString(createElement(QueryClientProvider, { client }, createElement(IsRestoringProvider, { value: true }, createElement(PrivateScopeContext.Provider, { value: scope }, createElement(editor === "product" ? ProductProbe : SettingsProbe)))));
  try {
    if (mode === "settings-pending" || mode === "status-pending") {
      const otherKey = mode === "settings-pending" ? adminProductOperationKeys.settings(1, 101) : adminProductOperationKeys.status(1, 101);
      client.setQueryData(otherKey, { busy: true, attempt: null }); render(); await hook.save();
      expect(writes).toBe(0); expect(hook.otherBlocked).toBe(true); expect(client.getQueryData<AdminProductDraft>(key)?.values).toEqual(values);
      client.setQueryData(otherKey, { busy: false, attempt: null });
    }
    render(); const pending = hook.save();
    if (mode === "late-scope" || mode === "pending-remount") {
      await expect.poll(() => writes).toBe(1); render(); await hook.save(); expect(writes).toBe(1);
      if (mode === "late-scope") { scope.dispose(); client.removeQueries({ queryKey: ["admin", 1] }); gate.resolve(); await pending; expect(client.getQueryData(key)).toBeUndefined(); return; }
      client.setQueryData(adminGiveawayKeys.detail(1, 101), { product, categories: [{ id: 1 }], imageIds: [77] });
      client.setQueryData(adminProductOperationKeys.settings(1, 101), { values: mapGiveawaySettings(product), baseline: "", initialized: true, busy: false, attempt: null });
      render("settings"); expect(settings.otherBlocked).toBe(true); await settings.save(); expect(writes).toBe(1); gate.resolve();
    }
    await pending; render();
    if (["role", "owner", "conflict"].includes(mode)) { expect(writes).toBe(0); expect(client.getQueryData<AdminProductDraft>(key)?.values).toEqual(values); return; }
    expect(writes).toBe(1);
    if (mode === "unknown-unapplied" || mode === "408") { await hook.save(); await hook.check(); expect(writes).toBe(1); expect(client.getQueryData<AdminProductDraft>(key)?.attempt?.status).toBe("unknown"); return; }
    if (mode === "read-error" || mode === "sync-error") {
      expect(client.getQueryData<AdminProductDraft>(key)).toMatchObject({ attempt: { status: "accepted" }, readFailed: true, values });
      render(); await hook.save(); expect(writes).toBe(1); failedRead = false; failedSync = false; await hook.check();
    }
    if (mode === "overlap") { expect(client.getQueryData<AdminProductDraft>(key)).toMatchObject({ overlap: true, attempt: null, values }); return; }
    expect(client.getQueryData<AdminProductDraft>(key)).toMatchObject({ attempt: null, readFailed: false, conflict: false, message: "Изменения сохранены" });
  } finally { gate.resolve(); stop(); scope.dispose(); client.clear(); adminProductApi.get = original.get; adminProductApi.relations = original.relations; adminProductApi.update = original.update; userApi.getProfileUser = original.profile; agentApi.list = original.agents; adminGiveawayApi.detail = original.detail; }
});
