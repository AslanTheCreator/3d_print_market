import { useEffect, useMemo, useRef } from "react";
import { skipToken, useQuery, useQueryClient } from "@tanstack/react-query";
import { agentApi, agentKeys } from "@/entities/agent";
import { userApi } from "@/entities/user";
import { imageApi } from "@/entities/image";
import {
  adminGiveawayKeys, adminProductApi, adminProductKeys, adminProductBaseline, adminProductInputFingerprint, adminProductMatchesInput,
  adminProductOperationKeys, hasAdminGiveawayAccess, hasOtherAdminProductWrite, mapAdminProductToInput,
  mergeAdminProduct, mapGiveawaySettings, synchronizeGiveaway, validateGiveawaySettings,
  type AdminProductInput, type AdminProductEditorData,
} from "@/entities/product";
import { usePrivateMutation, usePrivateScope } from "@/shared/lib/query";
import { ApiError } from "@/shared/lib/errorHandler";

interface Attempt { input: AdminProductInput; status: "accepted" | "unknown" | "rejected"; converted: boolean }
export interface AdminProductDraft {
  values: AdminProductInput | null; baseline: string; revision: number; busy: boolean;
  attempt: Attempt | null; message: string; conflict: boolean; readFailed: boolean; overlap: boolean; restorePending: boolean;
}
const empty = (): AdminProductDraft => ({ values: null, baseline: "", revision: 0, busy: false, attempt: null,
  message: "", conflict: false, readFailed: false, overlap: false, restorePending: false });

export function useAdminProductManagement(session: number | null, id: number, initial?: AdminProductEditorData, ready = false) {
  const client = useQueryClient(), scope = usePrivateScope();
  const key = useMemo(() => adminProductOperationKeys.product(session, id), [session, id]);
  const { data: state } = useQuery({ queryKey: key, queryFn: empty, initialData: empty, enabled: false, staleTime: Infinity, gcTime: Infinity });
  useQuery({ queryKey: adminProductOperationKeys.settings(session, id), queryFn: skipToken, enabled: false });
  useQuery({ queryKey: adminProductOperationKeys.status(session, id), queryFn: skipToken, enabled: false });
  const mounted = useRef(true), latest = useRef({ session, id }); latest.current = { session, id };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const current = () => session !== null && scope.id === session && scope.isCurrent();
  const access = () => current() && hasAdminGiveawayAccess(client, session);
  const caller = () => access() && mounted.current && latest.current.session === session && latest.current.id === id;
  const other = () => hasOtherAdminProductWrite(client, session, id, "product");
  const get = () => client.getQueryData<AdminProductDraft>(key) ?? empty();
  const update = (patch: Partial<AdminProductDraft>) => { if (current()) client.setQueryData<AdminProductDraft>(key, old => ({ ...(old ?? empty()), ...patch })); };
  useEffect(() => {
    if (!scope.isCurrent() || scope.id !== session || !ready || !initial || state.busy || state.attempt) return;
    const baseline = adminProductBaseline(initial);
    if (!state.values) client.setQueryData<AdminProductDraft>(key, old => ({ ...(old ?? empty()), values: mapAdminProductToInput(initial), baseline, revision: (old?.revision ?? 0) + 1 }));
    else if (state.baseline !== baseline && !state.conflict) client.setQueryData<AdminProductDraft>(key, old => ({ ...old!, conflict: true, message: "Товар или настройки изменились на сервере. Ввод сохранён. Перечитайте форму перед сохранением." }));
  }, [client, key, scope, session, initial, ready, state.values, state.baseline, state.busy, state.attempt, state.conflict]);
  const mutation = usePrivateMutation({ mutationFn: ({ owner, input }: { owner: number; input: AdminProductInput }) => adminProductApi.update(owner, id, input), retry: false, networkMode: "always" });
  async function read() {
    if (!access()) throw new Error("Доступ ADMIN не подтверждён");
    await client.fetchQuery({ queryKey: ["admin", session, "access"], staleTime: 0, retry: false, networkMode: "always", queryFn: ({ signal }) => userApi.getProfileUser(signal) });
    if (!access()) throw new Error("Доступ ADMIN утрачен");
    const owners = await client.fetchQuery({ queryKey: agentKeys.list(session), staleTime: 0, retry: false, networkMode: "always", queryFn: ({ signal }) => agentApi.list(signal) });
    if (!access()) throw new Error("Доступ ADMIN утрачен");
    const productKey = adminProductKeys.detail(session, id), relationsKey = adminProductKeys.relations(session, id);
    await Promise.all([productKey, relationsKey, adminGiveawayKeys.detail(session, id)].map(queryKey => client.cancelQueries({ queryKey, exact: true })));
    if (!access()) throw new Error("Доступ ADMIN утрачен");
    const product = await client.fetchQuery({ queryKey: productKey, staleTime: 0, retry: false, networkMode: "always", queryFn: ({ signal }) => adminProductApi.get(id, signal) });
    if (!access()) throw new Error("Доступ ADMIN утрачен");
    if (product.id !== id || !owners.some(agent => agent.id === product.participantId)) throw new Error("Владелец не входит в список ботов. Запись запрещена.");
    if (product.availability !== "EXTERNAL_PRODUCT" && product.availability !== "GIVEAWAY") throw new Error("Этот тип товара недоступен в редакторе бота");
    const relations = await client.fetchQuery({ queryKey: relationsKey, staleTime: 0, retry: false, networkMode: "always", queryFn: ({ signal }) => adminProductApi.relations(id, signal, product.availability === "GIVEAWAY") });
    if (!access()) throw new Error("Доступ ADMIN утрачен");
    const fresh = mergeAdminProduct(product, relations);
    if (fresh.product.availability === "GIVEAWAY") client.setQueryData(adminGiveawayKeys.detail(session, id), { product: fresh.product, imageIds: fresh.imageIds, categories: relations.categories });
    return fresh;
  }
  async function sync(fresh: AdminProductEditorData, converted: boolean) {
    if (!access()) throw new Error("Доступ ADMIN утрачен");
    if (fresh.product.availability === "GIVEAWAY") {
      await synchronizeGiveaway(client, { session: session!, productId: id, agentId: fresh.product.participantId, ownedByCurrentUser: false, scope, isCurrent: access, converted });
    } else {
      const keys = [adminProductKeys.detail(session, id), adminProductKeys.relations(session, id), adminProductKeys.list(session, fresh.product.participantId)];
      await Promise.all(keys.map(queryKey => client.cancelQueries({ queryKey })));
      if (!access()) throw new Error("Доступ ADMIN утрачен");
      await Promise.all(keys.map(queryKey => client.invalidateQueries({ queryKey, refetchType: "none" })));
      const results = await Promise.allSettled(keys.map(queryKey => client.refetchQueries({ queryKey, type: "active" }, { throwOnError: true })));
      if (!access() || results.some(result => result.status === "rejected")) throw new Error("Не удалось обновить связанные данные");
    }
  }
  async function reconcile() {
    const attempt = get().attempt;
    let fresh: AdminProductEditorData;
    try { fresh = await read(); }
    catch (error) {
      if (attempt?.status === "accepted" && initial && access()) {
        // Запись подтверждена: старые snapshots нельзя оставлять свежими после сбоя GET.
        const owner = initial.product.participantId;
        if (attempt.input.availability === "GIVEAWAY") {
          try { await synchronizeGiveaway(client, { session: session!, productId: id, agentId: owner, ownedByCurrentUser: false, scope, isCurrent: access, converted: attempt.converted }); } catch { /* Guard остаётся до успешной сверки. */ }
        } else await client.invalidateQueries({ queryKey: adminProductKeys.all(session), refetchType: "none" });
      }
      throw error;
    }
    if (!access()) return;
    if (!attempt) { update({ readFailed: false, conflict: get().baseline !== adminProductBaseline(fresh), message: "Актуальные данные прочитаны. Ввод сохранён." }); return; }
    const matches = adminProductMatchesInput(fresh, attempt.input);
    if (attempt.status === "unknown" && !matches) {
      update({ readFailed: false, message: "Результат PUT неизвестен. Отличающиеся данные не доказывают отказ записи; повторная отправка запрещена." }); return;
    }
    if (attempt.status === "unknown") update({ attempt: { ...attempt, status: "accepted" } });
    if (attempt.status !== "rejected") await sync(fresh, attempt.converted);
    const final = attempt.status === "rejected" ? fresh : await read();
    if (!access()) return;
    const values = mapAdminProductToInput(final), baseline = adminProductBaseline(final);
    if (attempt.status !== "rejected" && adminProductMatchesInput(final, attempt.input))
      update({ values, baseline, revision: get().revision + 1, attempt: null, readFailed: false, conflict: false, overlap: false, message: "Изменения сохранены" });
    else update({ attempt: null, readFailed: false, conflict: baseline !== get().baseline,
      message: attempt.status === "rejected" ? get().message : "PUT принят, но товар уже изменён. Ввод сохранён. Перечитайте форму явно." });
  }
  async function check() {
    if (!caller() || get().busy) return;
    update({ busy: true });
    try { await reconcile(); }
    catch { update({ readFailed: true, message: "Не удалось проверить детали, связи или доступ. Ввод сохранён; повторите только чтение." }); }
    finally { update({ busy: false }); }
  }
  async function restore() {
    const fresh = await read();
    if (!access() || fresh.product.availability !== "EXTERNAL_PRODUCT") throw new Error("Восстановление этого типа товара недоступно");
    await adminProductApi.status(id, "ACTIVE");
    await sync(fresh, false);
    const final = await read();
    update({ restorePending: false, readFailed: false, conflict: false, values: mapAdminProductToInput(final), baseline: adminProductBaseline(final), revision: get().revision + 1, message: "Товар восстановлен" });
  }
  async function retryRestore() {
    if (!caller() || get().busy || get().attempt || other()) return;
    update({ busy: true }); try { await restore(); } catch { update({ message: "Сохранение подтверждено. Восстановление недоступно; повторите отдельно." }); } finally { update({ busy: false }); }
  }
  async function save(activate = false) {
    const draft = get(), input = draft.values;
    if (!caller() || !ready || !input || draft.busy || draft.attempt || draft.restorePending || draft.readFailed || draft.conflict || other()) return;
    const validation = () => input.availability === "GIVEAWAY" ? Object.values(validateGiveawaySettings(input.giveaway)) : [];
    if (!input.name.trim() || validation().length) { update({ message: validation().join(". ") || "Введите название" }); return; }
    update({ busy: true, message: "", overlap: false }); let sent = false;
    try {
      const fresh = await read();
      if (!caller()) return;
      if (adminProductBaseline(fresh) !== draft.baseline) { update({ conflict: true, message: "Товар или настройки изменились на сервере. Ввод сохранён. Перечитайте форму перед сохранением." }); return; }
      if (validation().length) { update({ message: validation().join(". ") }); return; }
      const attempt: Attempt = { input, status: "unknown", converted: fresh.product.availability === "EXTERNAL_PRODUCT" && input.availability === "GIVEAWAY" };
      update({ attempt }); sent = true;
      await mutation.mutateAsync({ owner: fresh.product.participantId, input });
      update({ attempt: { ...attempt, status: "accepted" }, restorePending: activate && input.availability === "EXTERNAL_PRODUCT" });
    } catch (error) {
      if (!current()) return;
      if (sent) {
        const rejected = error instanceof ApiError && error.statusCode !== undefined && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 408;
        update({ attempt: { ...get().attempt!, status: rejected ? "rejected" : "unknown" }, overlap: error instanceof ApiError && error.statusCode === 400 && error.code === "GIVEAWAY_WINDOW_OVERLAP", message: error instanceof Error ? error.message : "Не удалось сохранить товар" });
      } else update({ readFailed: true, message: "Не удалось проверить свежие детали, связи или доступ. Запрос не отправлен; ввод сохранён." });
    } finally {
      try {
        if (sent && access()) await reconcile();
        if (get().restorePending && !get().attempt && access()) await restore();
      } catch { update({ readFailed: true, message: get().restorePending ? "Сохранение подтверждено. Восстановление недоступно; повторите отдельно." : "Результат требует проверки. Не удалось обновить данные; повторите только чтение." }); }
      finally { update({ busy: false }); }
    }
  }
  async function upload(file: File) {
    if (!caller() || get().busy || get().attempt || other()) return;
    update({ busy: true, message: "" });
    try {
      await client.fetchQuery({ queryKey: ["admin", session, "access"], staleTime: 0, retry: false, queryFn: ({ signal }) => userApi.getProfileUser(signal) });
      if (!caller()) return;
      const ids = await imageApi.saveImage(file, "PRODUCT");
      if (!access()) return;
      if (!ids.length || !ids.every(value => Number.isSafeInteger(value) && value > 0)) throw new Error("Сервер не вернул изображение");
      update({ values: { ...get().values!, imageIds: [...get().values!.imageIds, ...ids] }, revision: get().revision + 1 });
    } catch (error) { update({ message: error instanceof Error ? error.message : "Не удалось загрузить изображение" }); }
    finally { update({ busy: false }); }
  }
  return { state, save, check, upload, retryRestore, otherBlocked: other(),
    canWrite: access() && ready && !!state.values && !state.busy && !state.attempt && !state.restorePending && !state.readFailed && !state.conflict && !other(),
    dirty: !!state.values && !!initial && adminProductInputFingerprint(state.values) !== adminProductInputFingerprint(mapAdminProductToInput(initial)),
    edit: (values: AdminProductInput) => { if (caller() && !get().busy && !get().attempt) update({ values }); },
    convert: () => {
      if (!caller() || !ready || get().busy || get().attempt || other() || get().values?.availability !== "EXTERNAL_PRODUCT") return;
      update({ values: { ...get().values!, availability: "GIVEAWAY", giveaway: mapGiveawaySettings({ giveawayEnabled: true, giveawayWinnersCount: 1 }) }, revision: get().revision + 1 });
    },
    adopt: () => {
      if (!caller() || get().busy || get().attempt || !ready || !initial || get().readFailed || other()) return;
      update({ values: mapAdminProductToInput(initial), baseline: adminProductBaseline(initial), revision: get().revision + 1, conflict: false, overlap: false, message: "Форма обновлена по актуальным данным." });
    },
  };
}
