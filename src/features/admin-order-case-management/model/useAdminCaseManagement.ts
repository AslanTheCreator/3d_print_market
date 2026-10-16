import { useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import {
  adminOrderCasesApi, adminOrderCaseKeys, adminOrderKeys, orderQueryKeys, getAdminOrderCaseOutcomes,
  getSafeCaseTelegramUrl, hasAdminOrderCaseAccess, useAdminOrderCaseDetail,
  type OrderCaseDetail, type OrderCaseResolutionOutcome,
} from "@/entities/order";
import { userApi } from "@/entities/user";
import { usePrivateMutation, usePrivateScope } from "@/shared/lib/query";
import { getAdminCaseFailure, matchesCaseAttempt, type CaseAttempt, type CaseCommand } from "./result";

interface CaseDraft {
  initialized: boolean; context: string; comment: string; outcome: OrderCaseResolutionOutcome | "";
  url: string; baselineUrl: string; busy: boolean; attempt: CaseAttempt | null; message: string; failureMessage: string;
}
const contextOf = (detail: OrderCaseDetail) => JSON.stringify([detail.orderCase?.id, detail.orderCase?.orderId, detail.orderCase?.kind, detail.orderCase?.previousOrderStatus]);
const initial = (detail?: OrderCaseDetail): CaseDraft => ({ initialized: !!detail, context: detail ? contextOf(detail) : "", comment: "", outcome: "",
  url: detail?.orderCase?.telegramUrl ?? "", baselineUrl: detail?.orderCase?.telegramUrl ?? "", busy: false, attempt: null, message: "", failureMessage: "" });

export function useAdminCaseManagement(caseId: number, session: number | null) {
  const client = useQueryClient(); const scope = usePrivateScope();
  const detail = useAdminOrderCaseDetail(session, caseId);
  const key = useMemo(() => ["admin", session, "case-operation", caseId] as const, [session, caseId]);
  const detailKey = adminOrderCaseKeys.detail(session, caseId);
  const mounted = useRef(true); const latest = useRef({ caseId, session }); latest.current = { caseId, session };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const { data: state } = useQuery({ queryKey: key, queryFn: () => initial(),
    initialData: () => initial(client.getQueryData(detailKey)), enabled: false, staleTime: Infinity, gcTime: Infinity });
  const current = () => scope.isCurrent() && scope.id === session && session !== null;
  const hasAccess = () => current() && hasAdminOrderCaseAccess(client, session);
  const callerCurrent = () => hasAccess() && mounted.current && latest.current.caseId === caseId && latest.current.session === session;
  const get = () => client.getQueryData<CaseDraft>(key) ?? initial();
  const update = (patch: Partial<CaseDraft>) => { if (current()) client.setQueryData<CaseDraft>(key, previous => ({ ...(previous ?? initial()), ...patch })); };
  useEffect(() => {
    if (!state.initialized && detail.isSuccess && detail.data.orderCase?.id === caseId && scope.isCurrent() && scope.id === session) {
      client.setQueryData(key, initial(detail.data));
    } else if (state.initialized && detail.isSuccess && !detail.isFetching && !state.busy && !state.attempt &&
      state.url === state.baselineUrl && scope.isCurrent() && scope.id === session) {
      const url = detail.data.orderCase?.telegramUrl ?? "";
      if (url !== state.baselineUrl) client.setQueryData<CaseDraft>(key, previous => previous ? { ...previous, url, baselineUrl: url } : initial(detail.data));
    }
  }, [caseId, client, detail.data, detail.isSuccess, detail.isFetching, key, state.initialized, state.busy, state.attempt, state.url, state.baselineUrl, scope, session]);
  const mutation = usePrivateMutation({ mutationFn: (command: CaseCommand) => command.kind === "resolve"
    ? adminOrderCasesApi.resolve(command.caseId, command) : adminOrderCasesApi.telegram(command.caseId, command.url),
    retry: false, networkMode: "always" });
  const read = async (verifyAccess = false) => {
    if (!hasAccess()) throw new Error("Доступ ADMIN не подтверждён");
    if (verifyAccess) {
      await client.fetchQuery({ queryKey: ["admin", session, "access"], staleTime: 0, retry: false, networkMode: "always",
        queryFn: ({ signal }) => userApi.getProfileUser(signal) });
      if (!hasAccess()) throw new Error("Доступ ADMIN утрачен");
    }
    await client.cancelQueries({ queryKey: detailKey, exact: true });
    if (!hasAccess()) throw new Error("Доступ ADMIN не подтверждён");
    const fresh = await client.fetchQuery({ queryKey: detailKey, staleTime: 0, retry: false, networkMode: "always",
      queryFn: ({ signal }) => adminOrderCasesApi.detail(caseId, signal) });
    if (!hasAccess()) throw new Error("Доступ ADMIN не подтверждён");
    return fresh;
  };
  const synchronize = async (fresh: OrderCaseDetail, kind: CaseCommand["kind"]) => {
    if (!hasAccess()) throw new Error("Доступ ADMIN не подтверждён");
    const keys: QueryKey[] = [adminOrderCaseKeys.lists(session)];
    if (kind === "resolve") keys.push(adminOrderKeys.all(session), scope.key(orderQueryKeys.customerOrders()), scope.key(orderQueryKeys.sellerOrders()),
      scope.key(fresh.orderCase?.orderId ? orderQueryKeys.cases(fresh.orderCase.orderId) : orderQueryKeys.caseHistories()));
    await Promise.all(keys.map(queryKey => client.cancelQueries({ queryKey })));
    if (!hasAccess()) throw new Error("Доступ ADMIN не подтверждён");
    await Promise.all(keys.map(queryKey => client.invalidateQueries({ queryKey, refetchType: "none" })));
    const results = await Promise.allSettled(keys.map(queryKey => client.refetchQueries({ queryKey, type: "all" }, { throwOnError: true })));
    if (results.some(result => result.status === "rejected")) throw new Error("Не все связанные данные обновлены");
  };
  const reconcile = async () => {
    let readSucceeded = false;
    try {
      const fresh = await read(); if (!current()) return;
      readSucceeded = true;
      const draft = get(); const attempt = draft.attempt; if (!attempt) return;
      const matched = matchesCaseAttempt(fresh, attempt);
      if (matched && (attempt.status === "accepted" || attempt.status === "unknown")) {
        update({ attempt: { ...attempt, status: "accepted", checked: true, synced: false },
          ...(attempt.kind === "telegram" ? { baselineUrl: attempt.url } : {}), message: "Результат операции подтверждён актуальными деталями обращения." });
      } else if (attempt.status === "rejected" && !attempt.terminal && fresh.orderCase?.state === "OPEN") {
        update({ message: `${draft.failureMessage} Данные обновлены. Проверьте ввод; повтор возможен только явно.` });
      } else if (fresh.orderCase?.state === "RESOLVED" && (!matched || attempt.status === "rejected")) {
        update({ attempt: { ...attempt, status: "conflict", checked: true, synced: false }, message: `${draft.failureMessage} Обращение уже завершено. Показано серверное решение; ваш ввод сохранён, повторная отправка запрещена.` });
      } else {
        update({ message: `${draft.failureMessage} ${attempt.status === "accepted" ? "Запрос принят сервером, но изменение ещё не подтверждено деталями." : "Результат пока не подтверждён."} Повторная отправка заблокирована; повторите проверку.` });
      }
      await synchronize(fresh, attempt.kind);
      if (!current()) return;
      const saved = get().attempt;
      if (saved?.status === "rejected" && !saved.terminal && fresh.orderCase?.state === "OPEN") update({ attempt: null });
      else if (saved) update({ attempt: { ...saved, synced: true } });
    } catch {
      if (!current()) return;
      const draft = get();
      update({ message: `${draft.failureMessage} ${draft.attempt?.status === "accepted" ? "Запрос принят." : "Результат операции не проверен."} Не удалось обновить детали или связанные данные. Повторите проверку; повторная отправка заблокирована.` });
      // Отказ контрольного GET не должен оставлять остальные списки прежними.
      const cached = client.getQueryData<OrderCaseDetail>(detailKey);
      if (!readSucceeded && cached && draft.attempt && hasAccess()) {
        try {
          await synchronize(cached, draft.attempt.kind);
          if (current() && get().attempt) update({ attempt: { ...get().attempt!, synced: true } });
        } catch { /* Сообщение выше сохраняет необходимость повторить чтение. */ }
      }
    }
  };
  const submit = async (kind: CaseCommand["kind"]) => {
    const draft = get();
    if (!callerCurrent() || !draft.initialized || draft.busy || draft.attempt) return;
    const url = getSafeCaseTelegramUrl(draft.url.trim());
    if (kind === "resolve" ? !draft.outcome || !draft.comment.trim() : !url) return;
    update({ busy: true, message: "", failureMessage: "" }); let posting = false;
    try {
      const fresh = await read(true);
      if (!callerCurrent()) return;
      if (contextOf(fresh) !== draft.context || fresh.orderCase?.state !== "OPEN" ||
        (kind === "resolve" && (!draft.outcome || !getAdminOrderCaseOutcomes(fresh).includes(draft.outcome)))) {
        update({ message: "Обращение изменилось. Действие недоступно; актуальные детали показаны, ввод сохранён." }); return;
      }
      if (kind === "telegram") {
        const savedUrl = fresh.orderCase.telegramUrl ?? "";
        const baseline = getSafeCaseTelegramUrl(draft.baselineUrl.trim()) ?? draft.baselineUrl.trim();
        const saved = getSafeCaseTelegramUrl(savedUrl.trim()) ?? savedUrl.trim();
        if (saved === url) {
          update({ url: savedUrl, baselineUrl: savedUrl, message: "Эта ссылка уже сохранена в обращении. Повторная запись не требуется." }); return;
        }
        if (saved !== baseline) {
          update({ baselineUrl: savedUrl, ...(draft.url === draft.baselineUrl ? { url: savedUrl } : {}),
            message: "Ссылка изменена другим администратором. Ввод сохранён. Сверьте актуальную ссылку в деталях и при необходимости повторите сохранение явно." }); return;
        }
      }
      const command: CaseCommand = kind === "resolve" && draft.outcome ? { caseId, kind, outcome: draft.outcome, comment: draft.comment.trim() } : { caseId, kind: "telegram", url: url! };
      update({ attempt: { ...command, status: "unknown", checked: false, synced: false } });
      posting = true;
      await mutation.mutateAsync(command);
      if (current()) update({ attempt: { ...command, status: "accepted", checked: false, synced: false } });
    } catch (error) {
      if (!current()) return;
      if (posting) {
        const failure = getAdminCaseFailure(error); const attempt = get().attempt!;
        update({ attempt: { ...attempt, status: failure.status, terminal: failure.terminal }, message: failure.message, failureMessage: failure.message });
      } else update({ message: "Не удалось проверить доступ или прочитать обращение. Ввод сохранён, запрос не отправлен." });
    } finally {
      try { if (posting && hasAccess()) await reconcile(); }
      finally { update({ busy: false }); }
    }
  };
  const editable = () => callerCurrent() && !get().busy && !get().attempt;
  const resolved = state.attempt?.kind === "resolve" && state.attempt.status === "accepted" && state.attempt.checked;
  return { state, detail, submit,
    dirty: !resolved && (!!state.comment || !!state.outcome || state.url !== state.baselineUrl),
    canEdit: hasAccess() && state.initialized && !state.busy && !state.attempt && detail.isSuccess && !detail.isFetching && detail.data.orderCase?.state === "OPEN",
    edit: (patch: Partial<Pick<CaseDraft, "comment" | "outcome" | "url">>) => { if (editable()) update(patch); },
    checkResult: async () => {
      if (!callerCurrent() || get().busy || !get().attempt) return;
      update({ busy: true }); try { await reconcile(); } finally { update({ busy: false }); }
    },
    continueAfterTelegram: () => {
      const draft = get(); if (callerCurrent() && !draft.busy && draft.attempt?.kind === "telegram" && draft.attempt.status === "accepted" && draft.attempt.checked && draft.attempt.synced) update({ attempt: null, failureMessage: "" });
    },
  };
}
