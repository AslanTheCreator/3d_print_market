import { useEffect, useRef } from "react";
import { skipToken, useQuery, useQueryClient } from "@tanstack/react-query";
import { imageApi } from "@/entities/image";
import { userApi } from "@/entities/user";
import { adminGiveawayApi, adminGiveawayKeys, buildGiveawayCreateRequest, hasAdminGiveawayAccess, mapGiveawaySettings,
  synchronizeCreatedGiveaway, validateGiveawayProduct, validateGiveawaySettings,
  type GiveawayProductValues, type GiveawaySettingsValues, type AdminGiveawayProductRequest } from "@/entities/product";
import { usePrivateMutation, usePrivateScope } from "@/shared/lib/query";
import { ApiError } from "@/shared/lib/errorHandler";

export interface GiveawayCreationDraft {
  product: GiveawayProductValues; settings: GiveawaySettingsValues; revision: number;
  phase: "editing" | "unknown" | "accepted" | "synced"; busy: boolean; message: string; overlap: boolean;
  file: File | null; uploadError: string;
}
export const giveawayCreationKey = (session: number | null) => ["admin", session, "giveaway-create"] as const;
export const emptyGiveawayCreation = (): GiveawayCreationDraft => ({
  product: { name: "", description: "", currency: "RUB", categoryIds: [], imageIds: [] },
  settings: mapGiveawaySettings({ giveawayEnabled: true, giveawayWinnersCount: 1 }), revision: 0,
  phase: "editing", busy: false, message: "", overlap: false, file: null, uploadError: "",
});
export function useAdminGiveawayCreation(session: number | null) {
  const client = useQueryClient(), scope = usePrivateScope(), key = giveawayCreationKey(session);
  const profile = useQuery<{ role?: string }>({ queryKey: ["admin", session, "access"], queryFn: skipToken, enabled: false });
  const { data: state } = useQuery({ queryKey: key, queryFn: emptyGiveawayCreation, initialData: emptyGiveawayCreation, enabled: false, staleTime: Infinity, gcTime: Infinity });
  const mounted = useRef(true), latest = useRef(session); latest.current = session;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const current = () => session !== null && scope.id === session && scope.isCurrent();
  const access = () => current() && hasAdminGiveawayAccess(client, session);
  const caller = () => access() && mounted.current && latest.current === session;
  const get = () => client.getQueryData<GiveawayCreationDraft>(key) ?? emptyGiveawayCreation();
  const update = (patch: Partial<GiveawayCreationDraft>) => { if (current()) client.setQueryData<GiveawayCreationDraft>(key, old => ({ ...(old ?? emptyGiveawayCreation()), ...patch })); };
  const mutation = usePrivateMutation({ mutationFn: (input: AdminGiveawayProductRequest) => adminGiveawayApi.create(input), retry: false, networkMode: "always" });
  async function verifyAccess() {
    if (!access()) throw new Error("Доступ ADMIN не подтверждён");
    await client.fetchQuery({ queryKey: ["admin", session, "access"], staleTime: 0, retry: false, networkMode: "always", queryFn: ({ signal }) => userApi.getProfileUser(signal) });
    if (!access()) throw new Error("Доступ ADMIN утрачен");
  }
  async function readHistory() {
    const queryKey = adminGiveawayKeys.history(session, 0);
    await client.cancelQueries({ queryKey, exact: true });
    if (!access()) throw new Error("Доступ ADMIN утрачен");
    await client.fetchQuery({ queryKey, staleTime: 0, retry: false, networkMode: "always", queryFn: ({ signal }) => adminGiveawayApi.history(0, signal) });
    if (!access()) throw new Error("Доступ ADMIN утрачен");
  }
  async function finish() {
    await verifyAccess();
    await synchronizeCreatedGiveaway(client, { session: session!, scope, isCurrent: access });
    await readHistory();
    update({ phase: "synced", message: "Розыгрыш создан. История и связанные данные обновлены." });
  }
  async function submit() {
    const draft = get();
    if (!caller() || draft.busy || draft.phase !== "editing" || draft.file || draft.uploadError) return;
    const errors = () => [...Object.values(validateGiveawayProduct(draft.product)), ...Object.values(validateGiveawaySettings(draft.settings))];
    if (errors().length) { update({ message: errors().join(". ") }); return; }
    update({ busy: true, message: "", overlap: false }); let sent = false;
    try {
      await verifyAccess();
      if (!caller()) return;
      if (errors().length) { update({ message: errors().join(". ") }); return; }
      const input = buildGiveawayCreateRequest(draft.product, draft.settings);
      // Общий guard фиксируется до передачи запроса транспорту.
      update({ phase: "unknown" }); sent = true;
      await mutation.mutateAsync(input);
      update({ phase: "accepted", message: "Розыгрыш создан. Обновляем связанные данные." });
    } catch (error) {
      if (!current()) return;
      const rejected = error instanceof ApiError && error.statusCode !== undefined && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 408;
      update({ ...(sent && rejected ? { phase: "editing" as const } : {}),
        overlap: sent && error instanceof ApiError && error.statusCode === 400 && error.code === "GIVEAWAY_WINDOW_OVERLAP",
        message: !sent ? "Доступ не проверен. Создание не отправлено; ввод сохранён." : rejected ? (error as Error).message : "Ответ на запрос не получен. Результат создания неизвестен. Повторная отправка запрещена; проверьте историю." });
    } finally {
      try { if (get().phase === "accepted" && access()) await finish(); }
      catch { update({ message: "Розыгрыш создан, но связанные данные не обновлены. Повторите обновление данных без повторного создания." }); }
      finally { update({ busy: false }); }
    }
  }
  async function check() {
    if (!caller() || get().busy || get().phase === "editing") return;
    update({ busy: true });
    try {
      if (get().phase === "accepted") await finish();
      else if (get().phase === "unknown") {
        await verifyAccess(); await readHistory();
        update({ message: "История обновлена. Результат создания остаётся неизвестным: совпадение названия не подтверждает создание. Повторная отправка запрещена." });
      }
    } catch { update({ message: get().phase === "accepted" ? "Розыгрыш создан, но чтение не завершено. Повторите обновление данных без повторного создания." : "История недоступна. Результат создания неизвестен; повторная отправка запрещена." }); }
    finally { update({ busy: false }); }
  }
  async function upload(file?: File) {
    const draft = get(), selected = file ?? draft.file;
    if (!caller() || draft.busy || draft.phase !== "editing" || !selected) return;
    update({ busy: true, file: selected, uploadError: "" });
    try {
      await verifyAccess(); if (!caller()) return;
      const ids = await imageApi.saveImage(selected, "PRODUCT");
      if (!current()) return;
      if (!ids.length || !ids.every(id => Number.isSafeInteger(id) && id > 0)) throw new Error("Сервер не вернул корректные ID изображений");
      update({ product: { ...get().product, imageIds: [...get().product.imageIds, ...ids] }, revision: get().revision + 1, file: null });
    } catch (error) { update({ uploadError: error instanceof Error ? error.message : "Не удалось загрузить изображение" }); }
    finally { update({ busy: false }); }
  }
  const empty = emptyGiveawayCreation();
  return { state, submit, check, upload,
    allowed: profile.isSuccess && profile.data.role === "ADMIN" && access(),
    dirty: JSON.stringify([state.product, state.settings]) !== JSON.stringify([empty.product, empty.settings]) || !!state.file,
    edit: (patch: Partial<Pick<GiveawayCreationDraft, "product" | "settings">>) => { if (caller() && !get().busy && get().phase === "editing") update(patch); },
    discardFile: () => { if (caller() && !get().busy && get().phase === "editing") update({ file: null, uploadError: "" }); },
  };
}
