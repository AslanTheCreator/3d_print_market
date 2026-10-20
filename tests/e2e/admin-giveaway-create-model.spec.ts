import { expect, test } from "@playwright/test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { IsRestoringProvider, QueryClient, QueryClientProvider, QueryObserver, type QueryKey } from "@tanstack/react-query";
import { adminGiveawayApi, adminGiveawayKeys, adminProductKeys, buildGiveawayCreateRequest, giveawayKeys, productKeys, synchronizeCreatedGiveaway, validateGiveawayProduct } from "@/entities/product";
import { userApi } from "@/entities/user";
import { imageApi } from "@/entities/image";
import { authClient, publicClient } from "@/shared/api";
import { createPrivateScope, PrivateScopeContext } from "@/shared/lib/query";
import { ApiError } from "@/shared/lib/errorHandler";
import { emptyGiveawayCreation, giveawayCreationKey, useAdminGiveawayCreation, type GiveawayCreationDraft } from "@/features/admin-giveaway-management/model/useAdminGiveawayCreation";
import { adminGiveawayFixture, deferred } from "./helpers/adminGiveaway";

function filled(): GiveawayCreationDraft {
  const draft = emptyGiveawayCreation();
  return { ...draft, product: { ...draft.product, name: "Приз", description: "Описание приза" }, settings: { ...draft.settings,
    telegramUrl: "https://t.me/prize", startAt: new Date(Date.now() + 60_000).toISOString(), endAt: new Date(Date.now() + 86_400_000).toISOString(), rules: "Правила", homeText: "Текст главной" } };
}
test("B3 mapper whitelists nested giveaway, omits sale constraints and validates optional relationships", () => {
  const draft = filled(), input = buildGiveawayCreateRequest({ ...draft.product, categoryIds: [2], imageIds: [77] }, draft.settings);
  expect(input).toEqual({ availability: "GIVEAWAY", name: "Приз", description: "Описание приза", currency: "RUB", categoryIds: [2], imageIds: [77], giveaway: draft.settings });
  for (const key of ["price", "count", "prepaymentAmount", "externalUrl", "participantId", "agentId"]) expect(input).not.toHaveProperty(key);
  expect(emptyGiveawayCreation().settings.enabled).toBe(true);
  for (const patch of [{ name: " " }, { description: " " }, { categoryIds: [0] }, { imageIds: [-1] }]) expect(Object.keys(validateGiveawayProduct({ ...draft.product, ...patch })).length).toBeGreaterThan(0);
  const disabled = { ...draft.settings, enabled: false, startAt: "2020-01-01T00:00:00Z", endAt: "2020-01-02T00:00:00Z" };
  expect(buildGiveawayCreateRequest(draft.product, disabled).giveaway?.enabled).toBe(false);
  expect(() => buildGiveawayCreateRequest(draft.product, { ...disabled, enabled: true })).toThrow();
});

for (const mode of ["error-retry", "late-scope"] as const) test(`PRODUCT upload ${mode}: file stays in memory, no POST or stale completion`, async () => {
  const original = { image: imageApi.saveImage, profile: userApi.getProfileUser, create: adminGiveawayApi.create };
  const client = new QueryClient(), scope = createPrivateScope(1, () => true), key = giveawayCreationKey(1), draft = filled(), gate = deferred();
  client.setQueryData(key, draft); client.setQueryData(["admin", 1, "access"], { id: 1, role: "ADMIN" });
  let uploads = 0, posts = 0, fail = mode === "error-retry";
  userApi.getProfileUser = async () => ({ id: 1, role: "ADMIN" }) as Awaited<ReturnType<typeof userApi.getProfileUser>>;
  imageApi.saveImage = async (_, tag) => { expect(tag).toBe("PRODUCT"); uploads++; if (mode === "late-scope") await gate.promise; if (fail) throw new Error("Upload failed"); return [77]; };
  adminGiveawayApi.create = async () => { posts++; };
  let hook!: ReturnType<typeof useAdminGiveawayCreation>;
  function Probe() { hook = useAdminGiveawayCreation(1); return null; }
  try {
    renderToString(createElement(QueryClientProvider, { client }, createElement(IsRestoringProvider, { value: true }, createElement(PrivateScopeContext.Provider, { value: scope }, createElement(Probe)))));
    const pending = hook.upload(new File(["image"], "prize.png", { type: "image/png" }));
    if (mode === "late-scope") {
      await expect.poll(() => uploads).toBe(1); scope.dispose(); client.removeQueries({ queryKey: ["admin", 1] }); gate.resolve(); await pending;
      expect(client.getQueryData(key)).toBeUndefined(); expect(posts).toBe(0); return;
    }
    await pending; expect(client.getQueryData<GiveawayCreationDraft>(key)?.file?.name).toBe("prize.png");
    expect(client.getQueryData<GiveawayCreationDraft>(key)?.product.name).toBe(draft.product.name);
    await hook.submit(); expect(posts).toBe(0);
    fail = false; await hook.upload();
    expect(client.getQueryData<GiveawayCreationDraft>(key)).toMatchObject({ file: null, uploadError: "", product: { imageIds: [77], name: draft.product.name } });
    expect(uploads).toBe(2); expect(posts).toBe(0);
  } finally { gate.resolve(); scope.dispose(); client.clear(); imageApi.saveImage = original.image; userApi.getProfileUser = original.profile; adminGiveawayApi.create = original.create; }
});

test("dedicated admin create is auth POST /products; no success body/ID is assumed", async () => {
  const original = { post: authClient.post, publicPost: publicClient.post }; const calls: unknown[][] = [];
  const draft = filled(), input = buildGiveawayCreateRequest(draft.product, draft.settings); let body: unknown = null;
  authClient.post = (async (...args: unknown[]) => { calls.push(args); return { data: body }; }) as typeof authClient.post;
  publicClient.post = async () => { throw new Error("Public write forbidden"); };
  try {
    expect(await adminGiveawayApi.create(input)).toBeUndefined(); body = { unspecified: "ignored" };
    expect(await adminGiveawayApi.create(input)).toBeUndefined(); expect(calls).toEqual([["/products", input], ["/products", input]]);
  } finally { authClient.post = original.post; publicClient.post = original.publicPost; }
});

test("creation sync refetches active owner/header variants, invalidates inactive pages and preserves foreign scopes/bots/details/metadata", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: 600_000, retry: false } } }), scope = createPrivateScope(1, () => true);
  const own = scope.key([...productKeys.userLists(), 100, undefined, "DATE_DESC"]);
  const filtered = scope.key([...productKeys.userLists(), 10, { name: "prize" }, "PRICE_ASC"]);
  const inactive = scope.key([...productKeys.userLists(), 50, { status: "ACTIVE" }, "DATE_DESC"]);
  const keys: QueryKey[] = [own, filtered, inactive, adminGiveawayKeys.history(1, 0), adminGiveawayKeys.history(1, 1), giveawayKeys.active()];
  const foreign: QueryKey[] = [["private", 2, ...productKeys.userLists(), 100], adminGiveawayKeys.history(2, 0), adminProductKeys.list(1, 2), adminProductKeys.list(1, 3), adminProductKeys.detail(1, 8101), giveawayKeys.detail(8101), ["imageMetadata", 77]];
  const active = [own, filtered, keys[3], keys[5]], calls: string[] = [], stops: (() => void)[] = [];
  try {
    for (const key of [...keys, ...foreign]) {
      client.setQueryDefaults(key, { queryFn: async () => { calls.push(JSON.stringify(key)); return "fresh"; } }); client.setQueryData(key, "old");
      if (active.includes(key) || foreign.includes(key)) stops.push(new QueryObserver(client, { queryKey: key }).subscribe(() => {}));
    }
    // Шапка и страница наблюдают один общий query; синхронизация делает одно чтение.
    stops.push(new QueryObserver(client, { queryKey: own }).subscribe(() => {}));
    await synchronizeCreatedGiveaway(client, { session: 1, scope, isCurrent: () => true });
    expect(calls.sort()).toEqual(active.map(key => JSON.stringify(key)).sort());
    for (const key of keys) { expect(client.getQueryData(key)).toBe(active.includes(key) ? "fresh" : "old"); expect(client.getQueryState(key)?.isInvalidated).toBe(!active.includes(key)); }
    for (const key of foreign) { expect(client.getQueryData(key)).toBe("old"); expect(client.getQueryState(key)?.isInvalidated).toBe(false); }
  } finally { stops.forEach(stop => stop()); scope.dispose(); client.clear(); }
});

test("late old owner read is cancelled before control refetch and cannot restore the stale list", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: 600_000, retry: false } } }), scope = createPrivateScope(1, () => true);
  const key = scope.key([...productKeys.userLists(), 100, undefined, "DATE_DESC"]), gate = deferred(); let first = true; let oldSignal!: AbortSignal;
  client.setQueryDefaults(key, { queryFn: async ({ signal }) => { if (first) { first = false; oldSignal = signal; await gate.promise; return "late old list"; } return "created prize"; } });
  client.setQueryData(key, "old"); const stop = new QueryObserver(client, { queryKey: key }).subscribe(() => {});
  try {
    const old = client.fetchQuery({ queryKey: key, staleTime: 0 }).catch(() => {}); await expect.poll(() => !!oldSignal).toBe(true);
    await synchronizeCreatedGiveaway(client, { session: 1, scope, isCurrent: () => true }); expect(oldSignal.aborted).toBe(true);
    gate.resolve(); await old; expect(client.getQueryData(key)).toBe("created prize");
  } finally { gate.resolve(); stop(); scope.dispose(); client.clear(); }
});

for (const mode of ["success", "history-error", "owner-error", "unknown-applied", "unknown-unapplied", "timeout", "overlap", "revoked", "late-scope", "pending-remount"] as const) test(`real create hook ${mode}: guard, access, persistence and recovery without duplicate`, async () => {
  const original = { create: adminGiveawayApi.create, history: adminGiveawayApi.history, profile: userApi.getProfileUser };
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: 600_000, retry: false } } }), scope = createPrivateScope(1, () => true), key = giveawayCreationKey(1), draft = filled(), gate = deferred();
  let posts = 0, failHistory = false, failOwner = false;
  const profile = { id: 1, role: "ADMIN" } as Awaited<ReturnType<typeof userApi.getProfileUser>>;
  client.setQueryData(["admin", 1, "access"], profile); client.setQueryData(key, draft);
  const ownerKey = scope.key([...productKeys.userLists(), 100, undefined, "DATE_DESC"]);
  client.setQueryDefaults(ownerKey, { queryFn: async () => { if (failOwner) throw new Error("Owner list down"); return "fresh prize"; } });
  client.setQueryData(ownerKey, "old list"); const stop = new QueryObserver(client, { queryKey: ownerKey }).subscribe(() => {});
  userApi.getProfileUser = async () => mode === "revoked" ? { ...profile, role: "USER" } : profile;
  adminGiveawayApi.history = async () => { if (failHistory) throw new Error("History down"); return [adminGiveawayFixture(9001, { name: draft.product.name })]; };
  adminGiveawayApi.create = async () => {
    posts++; if (mode === "late-scope" || mode === "pending-remount") await gate.promise;
    if (mode === "history-error") failHistory = true;
    if (mode === "owner-error") failOwner = true;
    if (mode.startsWith("unknown")) throw new ApiError("Lost response", "NETWORK_ERROR");
    if (mode === "timeout") throw new ApiError("Timeout", "REQUEST_TIMEOUT", 408);
    if (mode === "overlap") throw new ApiError("Overlap", "GIVEAWAY_WINDOW_OVERLAP", 400);
  };
  let hook!: ReturnType<typeof useAdminGiveawayCreation>;
  function Probe() { hook = useAdminGiveawayCreation(1); return null; }
  const render = () => renderToString(createElement(QueryClientProvider, { client }, createElement(IsRestoringProvider, { value: true }, createElement(PrivateScopeContext.Provider, { value: scope }, createElement(Probe)))));
  try {
    render(); const pending = hook.submit();
    if (mode === "late-scope" || mode === "pending-remount") {
      await expect.poll(() => posts).toBe(1);
      if (mode === "late-scope") { scope.dispose(); client.removeQueries({ queryKey: ["admin", 1] }); gate.resolve(); await pending; expect(client.getQueryData(key)).toBeUndefined(); return; }
      render(); await hook.submit(); expect(posts).toBe(1); expect(client.getQueryData<GiveawayCreationDraft>(key)?.busy).toBe(true); gate.resolve();
    }
    await pending; render();
    if (mode === "revoked") { expect(posts).toBe(0); await hook.submit(); expect(posts).toBe(0); return; }
    expect(posts).toBe(1);
    if (mode === "overlap") { expect(client.getQueryData<GiveawayCreationDraft>(key)).toMatchObject({ phase: "editing", overlap: true, product: draft.product }); return; }
    await hook.submit(); expect(posts).toBe(1);
    if (mode.startsWith("unknown") || mode === "timeout") {
      expect(client.getQueryData<GiveawayCreationDraft>(key)?.phase).toBe("unknown");
      await hook.check(); render(); await hook.submit(); expect(posts).toBe(1); expect(client.getQueryData<GiveawayCreationDraft>(key)?.phase).toBe("unknown");
    } else {
      if (mode === "history-error" || mode === "owner-error") {
        expect(client.getQueryData<GiveawayCreationDraft>(key)?.phase).toBe("accepted"); failHistory = false; failOwner = false;
        await hook.check(); expect(posts).toBe(1);
      }
      expect(client.getQueryData<GiveawayCreationDraft>(key)?.phase).toBe("synced"); expect(client.getQueryData(ownerKey)).toBe("fresh prize");
    }
  } finally { gate.resolve(); stop(); scope.dispose(); client.clear(); Object.assign(adminGiveawayApi, { create: original.create, history: original.history }); userApi.getProfileUser = original.profile; }
});
