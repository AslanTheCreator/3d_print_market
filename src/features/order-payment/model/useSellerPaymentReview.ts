import { useMemo, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import {
  casesAllowDelivery, getOrderPaymentActions, rememberReviewedCalculation, hasTermsVersion, invalidateDeliveryReads, orderPaymentApi,
  orderQueryKeys, orderTermsApi, readDeliveryCases, readDeliveryOrder, usePaymentTermsCheck,
  type ListOrdersDto, type ListOrdersModel, type OrderCaseDetail,
} from "@/entities/order";
import { userKeys, useProfileUser, type UserProfileModel } from "@/entities/user";
import { transformToApiError } from "@/shared/lib/errorHandler";
import { usePrivateScope } from "@/shared/lib/query";
import { paymentAttemptStore } from "./paymentAttemptStore";
import { lastEventId, reviewHistory } from "./paymentEvidence";
import { reviewEvidence, reviewTerms, type ReviewDecision } from "./reviewEvidence";

export const seller = { role: "seller" } as const;
interface ReviewAttempt extends ReviewDecision {
  token: symbol;
  phase: "preparing" | "posting" | "accepted" | "unknown" | "rejected" | "done";
  busy: boolean;
  blocked: boolean;
  baseline?: number;
  settledVersion?: number;
  rejection?: string;
  message: string;
}

function reviewRejection(error: unknown) {
  const api = transformToApiError(error);
  const original = api.originalError;
  if (!isAxiosError(original) || original.response?.status !== api.statusCode || original.response?.data?.code !== api.code) return;
  if (api.statusCode === 401 && api.code === "TOKEN_INVALID_OR_EXPIRED" && original.config?.rejectedAfterRefresh) return api.code;
  if ((api.statusCode === 409 && ["ORDER_TERMS_STALE", "ORDER_CASE_ALREADY_OPEN", "ORDER_LEGACY_RECONCILIATION_REQUIRED"].includes(api.code ?? "")) ||
      (api.statusCode === 400 && api.code === "ORDER_PAYMENT_INVALID") ||
      (api.statusCode === 403 && api.code === "ACCESS_DENIED") ||
      (api.statusCode === 404 && api.code === "ORDER_NOT_FOUND")) return api.code;
}

export function useSellerPaymentReview(order: ListOrdersModel, available: boolean) {
  const client = useQueryClient();
  const scope = usePrivateScope();
  const actor = useProfileUser().data?.id;
  const id = order.orderId;
  const termsMatch = usePaymentTermsCheck("seller");
  const store = useMemo(() => {
    const cancel = scope.key(orderQueryKeys.cancelAttempt(id));
    return paymentAttemptStore<ReviewAttempt>(client, scope, id, scope.key(orderQueryKeys.reviewAttempt(id)), [cancel],
      attempt => !!attempt?.blocked, () => {
        const state = client.getQueryData<{ busy: boolean; accepted: boolean; recovery: string }>(cancel);
        return !!state && (state.busy || state.accepted || state.recovery !== "none");
      });
  }, [client, scope, id]);
  const attempt = useSyncExternalStore(store.subscribe, store.read, store.read);
  const otherBusy = useSyncExternalStore(store.subscribe, store.otherBusy, store.otherBusy);
  useSyncExternalStore(store.subscribe, store.minimumVersion, store.minimumVersion);
  const current = () => scope.isCurrent() && Number.isSafeInteger(actor) && !!actor && actor > 0 &&
    client.getQueryData<UserProfileModel>(scope.key(userKeys.profile()))?.id === actor;
  const owned = (job: ReviewAttempt) => current() && job.actor === actor && store.read()?.token === job.token;
  const listKey = scope.key(orderQueryKeys.sellerOrders());
  const historyKey = scope.key(orderQueryKeys.termsHistory(id));
  const historyOptions = { queryKey: historyKey, retry: false, staleTime: 0, networkMode: "always" as const,
    queryFn: ({ signal }: { signal: AbortSignal }) => orderTermsApi.history(seller, id, signal) };
  async function readHistory(valid = current) {
    await client.cancelQueries({ queryKey: historyKey, exact: true });
    if (!valid()) throw Error();
    return client.fetchQuery(historyOptions);
  }
  const caseKey = scope.key(orderQueryKeys.cases(id));
  function actions(row: ListOrdersModel | ListOrdersDto) {
    const cached = client.getQueryData<ListOrdersDto[]>(listKey)?.find(item => item.orderId === id);
    const cases = client.getQueryData<OrderCaseDetail[]>(caseKey);
    return getOrderPaymentActions(row, seller, {
      current: current() && client.getQueryState(scope.key(userKeys.profile()))?.status === "success" && available && row.product.sellerId === actor && !!cached && termsMatch(row) &&
        reviewTerms(row) === reviewTerms(cached) && hasTermsVersion(row.termsVersion) && row.termsVersion >= (store.minimumVersion() ?? 0),
      hasOpenCase: !!cases && !casesAllowDelivery(cases, id), attemptBlocked: store.otherBusy(),
    });
  }
  async function readOrder(valid = current) {
    const row = await readDeliveryOrder(client, scope, id);
    if (!valid() || !row || row.product.sellerId !== actor || !hasTermsVersion(row.termsVersion) ||
        row.termsVersion < (store.minimumVersion() ?? 0)) throw Error();
    store.confirmVersion(row.termsVersion);
    return row;
  }
  async function check(job: ReviewAttempt) {
    if (!owned(job)) return;
    store.update({ ...job, busy: true });
    try {
      const [row, events] = await Promise.all([readOrder(() => owned(job)), readHistory(() => owned(job))]);
      const cached = client.getQueryData<ListOrdersDto[]>(listKey)?.find(item => item.orderId === id);
      if (!owned(job) || row.userInfo.id !== job.buyer || !cached || reviewTerms(cached) !== reviewTerms(row)) throw Error();
      if (job.phase === "rejected") {
        const cases = await readDeliveryCases(client, scope, id);
        if (!owned(job) || !casesAllowDelivery(cases, id) ||
            (job.rejection === "ORDER_TERMS_STALE" && row.termsVersion! <= job.version)) throw Error();
      } else {
        if (!termsMatch(row) || !reviewEvidence(row, events, job, job.baseline)) throw Error();
        rememberReviewedCalculation(client, scope, row);
        await invalidateDeliveryReads(client, scope, id, seller, job.version);
        if (!owned(job)) return;
      }
      store.update({
        ...job,
        settledVersion: job.phase === "rejected" ? job.settledVersion : row.termsVersion!, reason: "", busy: false, blocked: false, phase: "done",
        message: job.phase === "rejected" ? job.message : "Решение подтверждено историей заказа." });
    } catch {
      if (owned(job)) store.update({ ...job, busy: false });
    }
  }
  async function submit(action: ReviewDecision["action"], reason: string, snapshot: string, active: () => boolean) {
    const { stage, actions: allowed } = actions(order);
    const version = order.termsVersion;
    const imageId = order.paymentProofImageId;
    if (!active() || !allowed.includes(action) || !stage || !hasTermsVersion(version) || !imageId || !actor ||
        reviewTerms(order) !== snapshot || (action === "return" && (!reason.trim() || reason.trim().length > 500))) return;
    let job: ReviewAttempt = { token: Symbol(), action, version, imageId, actor, buyer: order.userInfo.id, paidBefore: order.calculation?.confirmedPaidAmount ?? null, stage,
      settledVersion: store.read()?.settledVersion, reason: action === "return" ? reason.trim() : "", busy: true, blocked: true, phase: "preparing", message: "" };
    if (!store.begin(job)) return;
    try {
      const valid = () => owned(job);
      const [row, events, cases] = await Promise.all([readOrder(valid), readHistory(valid), readDeliveryCases(client, scope, id)]);
      if (!owned(job)) return;
      const baseline = lastEventId(events);
      const { state } = reviewHistory(row, events, job.buyer);
      if (!active() || reviewTerms(row) !== snapshot || !actions(row).actions.includes(action) || !casesAllowDelivery(cases, id) ||
          baseline === undefined || (state !== "current" && state !== "legacy")) {
        throw Error();
      }
      job = { ...job, phase: "posting", baseline };
      store.update(job);
      if (action === "approve") await orderPaymentApi.approve(seller, id, { expectedVersion: version }, scope.signal);
      else await orderPaymentApi.returnPayment(seller, id, { expectedVersion: version, reason: job.reason }, scope.signal);
      if (!owned(job)) return;
      job = { ...job, phase: "accepted", message: "Сервер принял решение. Ожидается сверка истории и расчёта." };
    } catch (error) {
      if (!owned(job)) return;
      if (job.phase === "preparing") {
        store.update({ ...job, busy: false, blocked: false, phase: "done", message: "Проверьте актуальные условия, чек и обращения. Решение не отправлено." });
        return;
      }
      const rejection = reviewRejection(error);
      job = { ...job, rejection, phase: rejection ? "rejected" : "unknown",
        message: rejection ? transformToApiError(error).message : "Результат проверки платежа неизвестен. Повторная отправка заблокирована." };
    }
    store.update(job);
    if (job.phase === "accepted" || job.rejection === "ORDER_TERMS_STALE") {
      await invalidateDeliveryReads(client, scope, id, seller, version);
      if (!owned(job)) return;
    }
    await check(job);
  }
  return { attempt, otherBusy, current, actions: actions(order), historyOptions,
    refresh: () => Promise.all([readOrder(), readHistory(), readDeliveryCases(client, scope, id)]), submit, actor, scopeId: scope.id,
    recheck: () => {
      const job = store.read();
      if (job?.blocked && !job.busy) void check(job);
    } };
}
