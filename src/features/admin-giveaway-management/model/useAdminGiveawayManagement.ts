import { useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { agentKeys, useAgents, type AgentSummary } from "@/entities/agent";
import { userApi } from "@/entities/user";
import {
  adminGiveawayApi, adminGiveawayKeys, giveawaySettingsFingerprint, hasAdminGiveawayAccess,
  mapGiveawaySettings, synchronizeGiveaway, toGiveawaySettingsRequest, useAdminGiveaway, validateGiveawaySettings,
  type AdminGiveawayProductResponse, type GiveawaySettingsValues, type GiveawaySettingsRequest,
} from "@/entities/product";
import { usePrivateMutation, usePrivateScope } from "@/shared/lib/query";
import { ApiError } from "@/shared/lib/errorHandler";

interface Attempt { values: GiveawaySettingsValues; status: "accepted" | "unknown" | "rejected" }
interface Draft {
  values: GiveawaySettingsValues; baseline: string; initialized: boolean; revision: number;
  busy: boolean; attempt: Attempt | null; message: string; conflict: boolean; readFailed: boolean; overlap: boolean;
}
const empty = (): Draft => ({ values: { enabled: false, telegramUrl: "", startAt: "", endAt: "", winnersCount: 0, rules: "", homeText: "" },
  baseline: "", initialized: false, revision: 0, busy: false, attempt: null, message: "", conflict: false, readFailed: false, overlap: false });
const settingsOf = (data: AdminGiveawayProductResponse) => mapGiveawaySettings(data.product!);

export function useAdminGiveawayManagement(session: number | null, id: number) {
  const client = useQueryClient(), scope = usePrivateScope();
  const detail = useAdminGiveaway(session, id), agents = useAgents(session);
  const key = useMemo(() => ["admin", session, "giveaway-operation", id] as const, [session, id]);
  const detailKey = adminGiveawayKeys.detail(session, id);
  const { data: state } = useQuery({ queryKey: key, queryFn: empty, initialData: empty, enabled: false, staleTime: Infinity, gcTime: Infinity });
  const mounted = useRef(true), latest = useRef({ id, session }); latest.current = { id, session };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const current = () => session !== null && scope.id === session && scope.isCurrent();
  const access = () => current() && hasAdminGiveawayAccess(client, session);
  const caller = () => access() && mounted.current && latest.current.id === id && latest.current.session === session;
  const get = () => client.getQueryData<Draft>(key) ?? empty();
  const update = (patch: Partial<Draft>) => { if (current()) client.setQueryData<Draft>(key, old => ({ ...(old ?? empty()), ...patch })); };
  useEffect(() => {
    if (!scope.isCurrent() || scope.id !== session || !detail.isSuccess || !detail.isFetchedAfterMount || detail.isFetching || state.busy || state.attempt) return;
    const values = settingsOf(detail.data), fingerprint = giveawaySettingsFingerprint(values);
    if (!state.initialized) client.setQueryData<Draft>(key, old => ({ ...(old ?? empty()), values, baseline: fingerprint, initialized: true, revision: (old?.revision ?? 0) + 1 }));
    else if (state.baseline !== fingerprint && !state.conflict) client.setQueryData<Draft>(key, old => ({ ...old!, conflict: true, message: "Настройки изменились на сервере. Ввод сохранён. Перечитайте форму перед сохранением." }));
  }, [client, detail.data, detail.isSuccess, detail.isFetchedAfterMount, detail.isFetching, key, scope, session, state.initialized, state.baseline, state.busy, state.attempt, state.conflict]);
  const mutation = usePrivateMutation({ mutationFn: (settings: GiveawaySettingsRequest) => adminGiveawayApi.update(id, settings), retry: false, networkMode: "always" });
  async function read() {
    if (!access()) throw new Error("Доступ ADMIN не подтверждён");
    await client.fetchQuery({ queryKey: ["admin", session, "access"], staleTime: 0, retry: false, networkMode: "always", queryFn: ({ signal }) => userApi.getProfileUser(signal) });
    if (!access()) throw new Error("Доступ ADMIN утрачен");
    await client.cancelQueries({ queryKey: detailKey, exact: true });
    if (!access()) throw new Error("Доступ ADMIN утрачен");
    const fresh = await client.fetchQuery({ queryKey: detailKey, staleTime: 0, retry: false, networkMode: "always", queryFn: ({ signal }) => adminGiveawayApi.detail(id, signal) });
    if (!access()) throw new Error("Доступ ADMIN утрачен");
    if (typeof fresh.product?.giveawayEnabled !== "boolean") throw new Error("Включённость розыгрыша не подтверждена сервером");
    return fresh;
  }
  async function sync(fresh: AdminGiveawayProductResponse) {
    if (!access()) throw new Error("Доступ ADMIN утрачен");
    let owners = client.getQueryData<AgentSummary[]>(agentKeys.list(session));
    let ownersFailed = false;
    try { owners = (await agents.refetch({ throwOnError: true })).data; }
    catch { ownersFailed = true; }
    if (!access()) throw new Error("Доступ ADMIN утрачен");
    const owner = fresh.product?.participantId;
    if (owner == null) throw new Error("Владелец розыгрыша не подтверждён");
    const profile = client.getQueryData<{ id: number }>(["admin", session, "access"]);
    await synchronizeGiveaway(client, { session: session!, productId: id, scope, isCurrent: access,
      agentId: owners?.some(agent => agent.id === owner) ? owner : undefined, ownedByCurrentUser: owner === profile?.id });
    if (ownersFailed || !owners) throw new Error("Не удалось проверить владельца. Связанные данные помечены устаревшими; повторите чтение.");
  }
  async function reconcile() {
    const attempt = get().attempt;
    let fresh: AdminGiveawayProductResponse;
    try { fresh = await read(); }
    catch (error) {
      // Принятый PUT должен сделать связанные snapshot устаревшими даже при отказе GET.
      const cached = client.getQueryData<AdminGiveawayProductResponse>(detailKey);
      if (attempt?.status === "accepted" && cached && access()) {
        try { await sync(cached); } catch { /* Guard сохраняется; повторять можно только чтение. */ }
      }
      throw error;
    }
    if (!access()) return;
    if (!attempt) {
      update({ readFailed: false, conflict: get().initialized && get().baseline !== giveawaySettingsFingerprint(settingsOf(fresh)), message: "Актуальные настройки прочитаны. Ввод сохранён." }); return;
    }
    const matches = giveawaySettingsFingerprint(settingsOf(fresh)) === giveawaySettingsFingerprint(attempt.values);
    if (attempt.status === "unknown" && !matches) {
      update({ readFailed: false, message: "Результат PUT пока неизвестен. Текущие настройки отличаются от отправленных; это не доказывает отказ записи. Повторная отправка запрещена. Повторите проверку." }); return;
    }
    if (attempt.status === "unknown" && matches) update({ attempt: { ...attempt, status: "accepted" } });
    // Подтверждённая запись сначала синхронизирует все связанные ключи.
    await sync(fresh);
    const final = await read();
    if (!access()) return;
    const values = settingsOf(final), baseline = giveawaySettingsFingerprint(values);
    if (attempt.status !== "rejected" && baseline === giveawaySettingsFingerprint(attempt.values)) {
      update({ values, baseline, revision: get().revision + 1, attempt: null, readFailed: false, conflict: false, overlap: false, message: "Настройки сохранены и связанные данные обновлены." });
    } else {
      update({ attempt: null, readFailed: false, conflict: baseline !== get().baseline,
        message: attempt.status === "rejected" ? get().message + " Данные проверены; исправьте ввод перед новой отправкой." : "PUT принят, но настройки уже изменены на сервере. Ввод сохранён. Перечитайте форму явно." });
    }
  }
  async function check() {
    if (!caller() || get().busy) return;
    update({ busy: true });
    try { await reconcile(); }
    catch { update({ readFailed: true, message: "Не удалось проверить доступ, детали или связанные данные. Ввод сохранён; повторите только чтение." }); }
    finally { update({ busy: false }); }
  }
  async function save() {
    const draft = get();
    if (!caller() || draft.busy || draft.attempt || draft.readFailed || draft.conflict || !draft.initialized || !detail.isSuccess || detail.isFetching || typeof detail.data.product?.giveawayEnabled !== "boolean") return;
    const validation = () => Object.values(validateGiveawaySettings(draft.values));
    if (validation().length) { update({ message: validation().join(". ") }); return; }
    update({ busy: true, message: "", overlap: false }); let sent = false;
    try {
      const fresh = await read();
      if (!caller()) return;
      if (giveawaySettingsFingerprint(settingsOf(fresh)) !== draft.baseline) {
        update({ conflict: true, message: "Настройки изменились на сервере. Ввод сохранён. Перечитайте форму перед сохранением." }); return;
      }
      // Дата могла истечь во время preflight. До создания attempt HTTP ещё не отправлен.
      if (validation().length) { update({ message: validation().join(". ") }); return; }
      const settings = toGiveawaySettingsRequest(draft.values);
      update({ attempt: { values: draft.values, status: "unknown" } }); sent = true;
      await mutation.mutateAsync(settings);
      update({ attempt: { values: draft.values, status: "accepted" } });
    } catch (error) {
      if (!current()) return;
      if (sent) {
        const rejected = error instanceof ApiError && error.statusCode !== undefined && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 408;
        update({ attempt: { values: draft.values, status: rejected ? "rejected" : "unknown" },
          overlap: error instanceof ApiError && error.statusCode === 400 && error.code === "GIVEAWAY_WINDOW_OVERLAP",
          message: error instanceof Error ? error.message : "Не удалось сохранить настройки" });
      } else update({ readFailed: true, message: "Не удалось проверить свежие детали и доступ. Запрос не отправлен; ввод сохранён." });
    } finally {
      try { if (sent && access()) await reconcile(); }
      catch { update({ readFailed: true, message: "Результат требует проверки. Не удалось обновить детали или связанные данные. Ввод сохранён; повторите только чтение." }); }
      finally { update({ busy: false }); }
    }
  }
  const dirty = state.initialized && giveawaySettingsFingerprint(state.values) !== state.baseline;
  return { state, detail, agents, dirty, save, check,
    canWrite: access() && detail.isSuccess && typeof detail.data.product?.giveawayEnabled === "boolean" && detail.isFetchedAfterMount && !detail.isFetching && !state.busy && !state.attempt && !state.conflict && !state.readFailed && state.initialized,
    edit: (values: GiveawaySettingsValues) => { if (caller() && !get().busy && !get().attempt) update({ values }); },
    adopt: () => {
      if (!caller() || get().busy || get().attempt || !detail.isSuccess || detail.isFetching || get().readFailed) return;
      const values = settingsOf(detail.data);
      update({ values, baseline: giveawaySettingsFingerprint(values), revision: get().revision + 1, conflict: false, overlap: false, message: "Форма обновлена по актуальным данным." });
    },
  };
}
