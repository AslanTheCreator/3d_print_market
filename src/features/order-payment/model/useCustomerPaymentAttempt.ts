import { useMemo, useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { hasTermsVersion, casesAllowDelivery, getOrderPaymentActions, orderApi, orderPaymentApi, orderQueryKeys, orderTermsApi,
  readDeliveryCases, usePaymentTermsCheck, type ListOrdersDto, type ListOrdersModel, type OrderCaseDetail,
  type PaymentStage } from "@/entities/order";
import { useProfileUser, userKeys, type UserProfileModel } from "@/entities/user";
import { imageApi } from "@/entities/image";
import { usePrivateScope } from "@/shared/lib/query";
import { transformToApiError } from "@/shared/lib/errorHandler";
import { lastEventId, latestReturn, paymentEvidence, paymentTerms, sameProofCycle } from "./paymentEvidence";
import { customerPaymentState, protectedAttempt, type Attempt } from "./customerPaymentState";

const buyer = { role: "customer" } as const;
const changedTerms = "Условия заказа изменились. Проверьте новый расчёт.";
function rejectionCode(error: unknown) {
  const api = transformToApiError(error);
  if (!isAxiosError(api.originalError) || api.originalError.response?.status !== api.statusCode) return;
  if (api.statusCode === 401 && api.code === "TOKEN_INVALID_OR_EXPIRED" && api.originalError.config?.rejectedAfterRefresh) return api.code;
  const allowed: Record<string, number[]> = {
    ORDER_TERMS_STALE: [409], ORDER_CASE_ALREADY_OPEN: [409], ORDER_LEGACY_RECONCILIATION_REQUIRED: [409],
    BAD_REQUEST: [400], ORDER_PAYMENT_INVALID: [400], INVALID_REQUEST: [400], ACCESS_DENIED: [403], ORDER_NOT_FOUND: [404], IMAGE_NOT_FOUND: [404],
  };
  if (api.code && api.statusCode && Object.hasOwn(allowed, api.code) && allowed[api.code].includes(api.statusCode)) return api.code;
}

export function useCustomerPaymentAttempt(order: ListOrdersModel, stage: PaymentStage, open: boolean, available: boolean) {
  const scope = usePrivateScope();
  const client = useQueryClient();
  const profile = useProfileUser();
  const id = profile.data?.id;
  const actor = typeof id === "number" && Number.isSafeInteger(id) && id > 0 ? id : undefined;
  const orderId = order.orderId;
  const termsMatch = usePaymentTermsCheck("customer");
  const profileKey = scope.key(userKeys.profile());
  const current = () => scope.isCurrent() && !!actor && client.getQueryData<UserProfileModel>(profileKey)?.id === actor;
  const agentId = order.product.sellerId;
  const store = useMemo(() => customerPaymentState(client, scope, orderId, agentId, actor, stage), [client, scope, orderId, agentId, actor, stage]);
  const { read, update: write, otherBusy } = store;
  const state = useSyncExternalStore(store.subscribe, read, read);
  const otherBlocked = useSyncExternalStore(store.subscribe, otherBusy, otherBusy);
  const floor = useSyncExternalStore(store.subscribe, store.minimumVersion, store.minimumVersion);
  const staleVersion = floor !== undefined && (!hasTermsVersion(order.termsVersion) || order.termsVersion < floor);
  const listKey = scope.key(orderQueryKeys.customerOrders());
  const listOptions = { queryKey: listKey, retry: false, staleTime: 0, networkMode: "always" as const,
    queryFn: ({ signal }: { signal: AbortSignal }) => orderApi.getCustomerOrders(signal) };
  useQuery({ ...listOptions, enabled: open && !!actor && scope.isCurrent(), refetchOnWindowFocus: false });
  const historyKey = scope.key(orderQueryKeys.termsHistory(orderId));
  const historyOptions = {
    queryKey: historyKey, queryFn: ({ signal }: { signal: AbortSignal }) => orderTermsApi.history(buyer, orderId, signal),
    retry: false, staleTime: 0, networkMode: "always" as const,
  };
  const history = useQuery({ ...historyOptions, enabled: open && !!actor && scope.isCurrent() });
  const expectedStatus = stage === "prepayment" ? "AWAITING_PREPAYMENT" : "AWAITING_PAYMENT";
  const returned = !staleVersion && order.actualStatus === expectedStatus ? latestReturn(history.data, order, stage, actor) : undefined;
  const readHistory = async () => {
    await client.cancelQueries({ queryKey: historyKey, exact: true });
    if (!current()) throw Error("Сессия изменилась");
    return client.fetchQuery(historyOptions);
  };
  const readOrder = async () => {
    await client.cancelQueries({ queryKey: listKey, exact: true });
    if (!current()) throw Error("Сессия изменилась");
    const rows = await client.fetchQuery(listOptions);
    const row = rows.find(item => item.orderId === orderId);
    if (!current() || !row || row.product.sellerId === actor) throw Error("Покупка не подтверждена");
    if (hasTermsVersion(row.termsVersion)) store.confirmVersion(row.termsVersion);
    return row;
  };
  const check = async (attempt: Attempt) => {
    const owned = () => current() && read()?.token === attempt.token;
    if (!owned()) return;
    write({ ...attempt, busy: true });
    try {
      const [row, events] = await Promise.all([readOrder(), readHistory()]);
      if (!owned()) return;
      if (!hasTermsVersion(row.termsVersion) || row.termsVersion < Math.max(attempt.version, store.minimumVersion() ?? 0)) throw Error();
      if (attempt.phase === "rejected") {
        if (attempt.rejection === "ORDER_CASE_ALREADY_OPEN") {
          const cases = await readDeliveryCases(client, scope, orderId);
          if (!owned()) return;
          if (!casesAllowDelivery(cases, orderId)) throw Error();
        }
        const stale = attempt.rejection === "ORDER_TERMS_STALE" && row.termsVersion === attempt.version;
        write({ ...attempt, busy: false, needsRead: stale });
      } else {
        const proved = attempt.imageId && paymentEvidence(row, events, stage, attempt.version, attempt.imageId, actor!, attempt.baseline);
        const acceptedPending = attempt.phase === "accepted" && row.termsVersion - attempt.version === 1 &&
          row.actualStatus === expectedStatus + "_APPROVAL" &&
          (row.paymentProofImageId == null || row.paymentProofImageId === attempt.imageId);
        const outcome = proved || (acceptedPending && "pending");
        const message = outcome === "returned" ? "Чек возвращён по истории заказа" :
          outcome === "approved" ? "Платёж подтверждён по истории заказа" : "Чек передан на проверку";
        write(outcome ? { ...attempt, phase: "verified", verifiedVersion: row.termsVersion, needsRead: false, imageId: undefined, busy: false, message } :
          { ...attempt, busy: false });
      }
    } catch {
      if (owned()) write({ ...attempt, busy: false, needsRead: true });
    }
  };
  const knownOpen = () => client.getQueryData<OrderCaseDetail[]>(scope.key(orderQueryKeys.cases(orderId)))?.some(
    item => item.orderCase?.orderId === orderId && item.orderCase.state === "OPEN") ?? false;
  const allowed = (row: ListOrdersModel | ListOrdersDto) =>
    getOrderPaymentActions(row, buyer, {
      current: available && current() && client.getQueryState(profileKey)?.status === "success" &&
        hasTermsVersion(row.termsVersion) && row.termsVersion >= (store.minimumVersion() ?? 0) &&
        row.product.sellerId !== actor && termsMatch(row),
      hasOpenCase: knownOpen(),
      attemptBlocked: otherBusy(),
    }).stage === stage;
  const submit = async (file: File | null, reuse: number | undefined, proofVersion: number | undefined, active: () => boolean) => {
    if (!current() || !active() || !allowed(order) || protectedAttempt(read()) || order.termsVersion == null || !actor || !hasTermsVersion(proofVersion) || (!file && !reuse)) return;
    const fingerprint = paymentTerms(order);
    let attempt: Attempt = {
      token: Symbol(), phase: "preparing", busy: true, version: order.termsVersion,
      proofVersion, terms: fingerprint, message: "", imageId: reuse,
    };
    if (!store.begin(attempt)) return;
    const owned = () => current() && read()?.token === attempt.token;
    const matches = (row: ListOrdersDto) => active() && allowed(row) && paymentTerms(row) === fingerprint;
    const stop = (message: string) => {
      if (owned()) write({ ...attempt, phase: "draft", busy: false, message });
    };
    try {
      const row = await readOrder();
      if (!owned()) return;
      if (!matches(row)) return stop(changedTerms);
      if (!attempt.imageId && file) {
        attempt = { ...attempt, phase: "uploading" };
        write(attempt);
        const [imageId] = await imageApi.saveOrderImage(file, orderId, scope.signal, true);
        if (!owned()) return;
        attempt = { ...attempt, imageId, phase: "preparing" };
        write(attempt);
      }
      if (!active() || !allowed(order)) return stop(changedTerms);
      const [fresh, events] = await Promise.all([readOrder(), readHistory().catch(() => undefined)]);
      if (!owned()) return;
      if (!matches(fresh) || !attempt.imageId) return stop(changedTerms);
      const lastReturn = latestReturn(events, fresh, stage, actor);
      if (lastReturn && (lastReturn.imageId === attempt.imageId || lastReturn.expectedVersion! >= proofVersion)) {
        attempt = { ...attempt, imageId: undefined };
        return stop("Этот чек уже возвращён. Выберите новый файл.");
      }
      if (!sameProofCycle(events, proofVersion, attempt.version)) return stop("История не подтверждает актуальность чека. Обновите данные или выберите новый файл.");
      attempt = { ...attempt, phase: "posting", baseline: lastEventId(events) };
      write(attempt);
      await orderPaymentApi.submit(buyer, orderId, stage, { expectedVersion: attempt.version, imageId: attempt.imageId! }, scope.signal);
      if (!owned()) return;
      attempt = { ...attempt, phase: "accepted", message: "Чек передан на проверку" };
    } catch (error) {
      if (!owned()) return;
      if (attempt.phase !== "posting") {
        return stop(attempt.phase === "uploading" ? "Не удалось загрузить изображение на сервер" : "Не удалось проверить актуальные условия заказа.");
      }
      const rejection = rejectionCode(error);
      attempt = { ...attempt, rejection, phase: rejection ? "rejected" : "unknown", needsRead: !!rejection,
        imageId: rejection === "IMAGE_NOT_FOUND" ? undefined : attempt.imageId,
        message: rejection ? transformToApiError(error).message : "Результат отправки чека неизвестен. Повторная отправка заблокирована." };
    }
    await check(attempt);
  };
  return { state, actor, staleVersion, hasOpenCase: knownOpen(), otherBlocked, returned, submit, canSubmit: allowed(order),
    recheck: () => {
      const attempt = read();
      if (attempt && !attempt.busy && protectedAttempt(attempt)) void check(attempt);
    },
    refreshHistory: () => { if (current()) void history.refetch(); },
    discard: store.discard,
  };
}
