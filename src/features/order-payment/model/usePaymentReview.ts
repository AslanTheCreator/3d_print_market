import { useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import {
  readAdminOrderPage, adminOrderKeys, adminOrderCaseKeys, adminOrderCasesApi, hasAdminOrderCaseAccess,
  hasCurrentDeliveryVersion, hasAgentId, knownOpenAdminCase, type AdminOrderDto, type AdminOrderFilter,
  casesAllowDelivery, getOrderPaymentActions, rememberReviewedCalculation, hasTermsVersion, invalidateDeliveryReads, orderPaymentApi,
  orderQueryKeys, orderTermsApi, readDeliveryCases, readDeliveryOrder, usePaymentTermsCheck,
  type ListOrdersDto, type ListOrdersModel, type OrderCaseDetail,
} from "@/entities/order";
import { userKeys, type UserProfileModel } from "@/entities/user";
import { transformToApiError } from "@/shared/lib/errorHandler";
import { usePrivateScope } from "@/shared/lib/query";
import { protectedAttempt, type Attempt } from "./customerPaymentState";
import { paymentAttemptStore } from "./paymentAttemptStore";
import { lastEventId, reviewHistory } from "./paymentEvidence";
import { reviewEvidence, reviewTerms, type ReviewDecision } from "./reviewEvidence";

export type ReviewContext = { role: "seller" } | { role: "admin"; agentId: number; session: number | null; filter: AdminOrderFilter };
type ReviewOrder = ListOrdersModel | AdminOrderDto;
type ServerOrder = ListOrdersDto | AdminOrderDto;
interface ReviewAttempt extends ReviewDecision {
  token: symbol;
  agentId: number;
  phase: "preparing" | "posting" | "accepted" | "unknown" | "rejected" | "done";
  busy: boolean;
  blocked: boolean;
  baseline?: number;
  settledVersion?: number;
  rejection?: string;
  openCaseId?: number;
  message: string;
}

function reviewRejection(error: unknown, role: ReviewContext["role"]) {
  const api = transformToApiError(error);
  const original = api.originalError;
  if (!isAxiosError(original) || original.response?.status !== api.statusCode || original.response?.data?.code !== api.code) return;
  if (api.statusCode === 401 && api.code === "TOKEN_INVALID_OR_EXPIRED" && original.config?.rejectedAfterRefresh) return api.code;
  if ((api.statusCode === 409 && ["ORDER_TERMS_STALE", "ORDER_CASE_ALREADY_OPEN", "ORDER_LEGACY_RECONCILIATION_REQUIRED"].includes(api.code ?? "")) ||
      (api.statusCode === 400 && api.code === "ORDER_PAYMENT_INVALID") ||
      (api.statusCode === 403 && api.code === "ACCESS_DENIED") ||
      (api.statusCode === 404 && (api.code === "ORDER_NOT_FOUND" || (role === "admin" && api.code === "PARTICIPANT_NOT_FOUND")))) return api.code;
}

export function usePaymentReview(order: ReviewOrder, available: boolean, context: ReviewContext, actor?: number) {
  const client = useQueryClient();
  const scope = usePrivateScope();
  const id = order.orderId;
  const admin = context.role === "admin" ? context : undefined;
  const agentId = admin ? admin.agentId : order.product.sellerId;
  const participantTermsMatch = usePaymentTermsCheck("seller");
  const termsMatch = (row: ReviewOrder | ServerOrder) => admin
    ? hasCurrentDeliveryVersion(client, scope, row) : participantTermsMatch(row);
  const isAdmin = !!admin;
  const buyerId = order.userInfo.id;
  const store = useMemo(() => {
    const cancel = scope.key(orderQueryKeys.cancelAttempt(id));
    const adminCancel = scope.key(["adminOrderCancel", agentId, id]);
    const sellerReview = scope.key(orderQueryKeys.reviewAttempt(id));
    const adminReview = scope.key(orderQueryKeys.adminReviewAttempt(agentId, id));
    const otherReview = isAdmin ? sellerReview : adminReview;
    const delivery = [scope.key(["deliveryAttempt", "admin", agentId, id]), ...(actor === agentId ? [scope.key(["deliveryAttempt", "seller", id])] : [])];
    const buyerKeys = isAdmin && actor === buyerId ? ["prepayment", "full"].map(stage => scope.key(["customerPaymentAttempt", id, actor, stage])) : [];
    return paymentAttemptStore<ReviewAttempt>(client, scope, id, agentId, isAdmin ? adminReview : sellerReview,
      [cancel, adminCancel, otherReview, ...delivery, ...buyerKeys], attempt => !!attempt?.blocked, () => {
        const state = (!isAdmin || actor === agentId || actor === buyerId) && client.getQueryData<{ busy: boolean; accepted: boolean; recovery: string }>(cancel);
        const cancellation = client.getQueryData<{ busy: boolean; accepted: boolean; unknown: boolean }>(adminCancel);
        const other = client.getQueryData<ReviewAttempt>(otherReview);
        return buyerKeys.some(key => protectedAttempt(client.getQueryData<Attempt>(key))) || !!(other?.blocked && other.agentId === agentId) || !!(state && (state.busy || state.accepted || state.recovery !== "none")) ||
          !!(cancellation && (cancellation.busy || cancellation.accepted || cancellation.unknown)) || delivery.some(key => {
            const attempt = client.getQueryData<{ busy: boolean; phase: string }>(key);
            return !!attempt && (attempt.busy || attempt.phase !== "idle");
          });
      });
  }, [client, scope, id, agentId, isAdmin, actor, buyerId]);
  const attempt = useSyncExternalStore(store.subscribe, store.read, store.read);
  const otherBusy = useSyncExternalStore(store.subscribe, store.otherBusy, store.otherBusy);
  useSyncExternalStore(store.subscribe, store.minimumVersion, store.minimumVersion);
  const accessKey = admin ? ["admin", scope.id, "access"] : scope.key(userKeys.profile());
  const current = () => scope.isCurrent() && hasAgentId(id) && hasAgentId(actor) && hasAgentId(agentId) &&
    client.getQueryState(accessKey)?.status === "success" && client.getQueryData<UserProfileModel>(accessKey)?.id === actor &&
    (admin ? scope.id === admin.session && hasAdminOrderCaseAccess(client, scope.id) &&
      (admin.filter.agentId === undefined || admin.filter.agentId === agentId) && "sellerId" in order && order.sellerId === agentId : actor === agentId);
  // Поздний ответ может изменить только исходный резерв. Перечитывать списки из закрытой панели нельзя.
  const identity = JSON.stringify([scope.id, actor, agentId, id, admin?.filter.agentId, admin?.filter.page, admin?.filter.status]);
  const mountedIdentity = useRef<string | null>(null);
  useLayoutEffect(() => {
    mountedIdentity.current = identity;
    return () => { mountedIdentity.current = null; };
  }, [identity]);
  const originalView = () => current() && (!admin || mountedIdentity.current === identity);
  const owned = (job: ReviewAttempt) => originalView() && job.actor === actor && job.agentId === agentId && store.read()?.token === job.token;
  const listKey = admin ? adminOrderKeys.list(scope.id, admin.filter) : scope.key(orderQueryKeys.sellerOrders());
  const cachedRow = () => client.getQueryState<ServerOrder[]>(listKey)?.status === "success"
    ? client.getQueryData<ServerOrder[]>(listKey)?.find(row => row.orderId === id && (!admin || ("sellerId" in row && row.sellerId === agentId))) : undefined;
  const historyKey = admin ? adminOrderKeys.history(scope.id, agentId, id) : scope.key(orderQueryKeys.termsHistory(id));
  const historyOptions = { queryKey: historyKey, retry: false, staleTime: 0, networkMode: "always" as const,
    queryFn: ({ signal }: { signal: AbortSignal }) => {
      if (!current()) throw Error("Доступ к заказу изменился");
      return orderTermsApi.history(context, id, signal);
    } };
  async function readHistory(valid = originalView) {
    await client.cancelQueries({ queryKey: historyKey, exact: true });
    if (!valid()) throw Error();
    return client.fetchQuery(historyOptions);
  }
  const caseKey = scope.key(orderQueryKeys.cases(id));
  const openAdminCase = () => knownOpenAdminCase(client, scope.id, agentId, id);
  async function casesClear() {
    if (!originalView()) throw Error();
    if (!admin) return casesAllowDelivery(await readDeliveryCases(client, scope, id), id);
    const caseId = openAdminCase();
    if (!caseId) return true;
    const detail = await client.fetchQuery({ queryKey: adminOrderCaseKeys.detail(scope.id, caseId), staleTime: 0, retry: false,
      queryFn: ({ signal }) => adminOrderCasesApi.detail(caseId, signal) });
    return originalView() && detail.orderCase?.orderId === id && detail.orderCase.state === "RESOLVED" && !openAdminCase();
  }
  function actions(row: ReviewOrder | ServerOrder) {
    const cached = cachedRow();
    const cases = client.getQueryData<OrderCaseDetail[]>(caseKey);
    return getOrderPaymentActions(row, context, {
      current: current() && available && !!cached && termsMatch(row) && reviewTerms(row) === reviewTerms(cached) &&
        hasTermsVersion(row.termsVersion) && row.termsVersion >= (store.minimumVersion() ?? 0),
      hasOpenCase: admin ? !!openAdminCase() : !!cases && !casesAllowDelivery(cases, id), attemptBlocked: store.otherBusy(),
    });
  }
  async function readOrder(valid = originalView, recovery = false) {
    if (!valid()) throw Error();
    let row = admin ? await readAdminOrderPage(client, scope.id, agentId, id, admin.filter, valid) : await readDeliveryOrder(client, scope, id);
    if (!valid()) throw Error();
    if (!row && admin && recovery && (admin.filter.status || admin.filter.agentId === undefined || admin.filter.page !== 0)) {
      row = await readAdminOrderPage(client, scope.id, agentId, id, { agentId, page: 0 }, valid);
    }
    if (!valid() || !row || (!admin && row.product.sellerId !== actor) || !hasTermsVersion(row.termsVersion) ||
        row.termsVersion < (store.minimumVersion() ?? 0)) throw Error();
    store.confirmVersion(row.termsVersion);
    return row;
  }
  function retainOnAccessChange(job: ReviewAttempt) {
    if (job.phase === "preparing") {
      store.update({ ...job, busy: false, blocked: false, phase: "done", message: "Доступ изменился. Обновите данные заказа." });
    } else {
      store.update({ ...job, phase: job.phase === "posting" ? "unknown" : job.phase, busy: false,
        message: job.phase === "rejected" ? job.message : "Результат требует проверки в исходном административном контексте." });
    }
  }
  async function check(job: ReviewAttempt) {
    if (!owned(job)) { retainOnAccessChange(job); return; }
    store.update({ ...job, busy: true });
    try {
      if (admin && job.rejection === "ORDER_CASE_ALREADY_OPEN") {
        let caseId = job.openCaseId;
        let observedOpen = !!caseId;
        if (!caseId) {
          const cases = await adminOrderCasesApi.list("OPEN", 0, scope.signal);
          if (!owned(job)) throw Error();
          caseId = cases.find(entry => entry.orderId === id && entry.state === "OPEN")?.caseId ?? undefined;
          observedOpen = hasAgentId(caseId);
          caseId ??= openAdminCase();
        }
        if (!hasAgentId(caseId)) throw Error();
        if (observedOpen) job = { ...job, openCaseId: caseId };
        const detail = await client.fetchQuery({ queryKey: adminOrderCaseKeys.detail(scope.id, caseId), staleTime: 0, retry: false,
          queryFn: ({ signal }) => adminOrderCasesApi.detail(caseId, signal) });
        if (!owned(job) || detail.sellerId !== agentId || detail.orderCase?.orderId !== id) throw Error();
        if (detail.orderCase.state === "OPEN") job = { ...job, openCaseId: caseId };
        if (!observedOpen || detail.orderCase.state !== "RESOLVED") throw Error();
      }
      const [row, events] = await Promise.all([readOrder(() => owned(job), true), readHistory(() => owned(job))]);
      const cached = cachedRow();
      if (!owned(job) || row.userInfo.id !== job.buyer || (!admin && !cached) || (cached && reviewTerms(cached) !== reviewTerms(row))) throw Error();
      if (job.phase === "rejected") {
        if (admin) {
          await client.fetchQuery({ queryKey: accessKey, staleTime: 0, retry: false });
          if (!owned(job)) throw Error();
        }
        if (job.rejection === "PARTICIPANT_NOT_FOUND" && row.actualStatus.endsWith("_APPROVAL")) {
          const { state } = reviewHistory(row, events, job.buyer);
          if (state !== "current" && state !== "legacy") throw Error();
        }
        const clear = await casesClear();
        if (!owned(job) || !clear ||
            (job.rejection === "ORDER_TERMS_STALE" && row.termsVersion! <= job.version)) throw Error();
      } else {
        if (!termsMatch(row) || !reviewEvidence(row, events, job, job.baseline)) throw Error();
        rememberReviewedCalculation(client, scope, row);
        await invalidateDeliveryReads(client, scope, id, context, job.version);
        if (!owned(job)) { retainOnAccessChange(job); return; }
      }
      store.update({
        ...job,
        settledVersion: job.phase === "rejected" ? job.settledVersion : row.termsVersion!, reason: "", busy: false, blocked: false, phase: "done",
        message: job.rejection === "ORDER_CASE_ALREADY_OPEN" && admin ? "Обращение закрыто. Проверьте заказ перед новым решением."
          : job.phase === "rejected" ? job.message : "Решение подтверждено историей заказа." });
    } catch {
      if (owned(job)) store.update({ ...job, busy: false });
      else retainOnAccessChange(job);
    }
  }
  async function submit(action: ReviewDecision["action"], reason: string, snapshot: string, active: () => boolean) {
    const { stage, actions: allowed } = actions(order);
    const version = order.termsVersion;
    const imageId = order.paymentProofImageId;
    if (!active() || !allowed.includes(action) || !stage || !hasTermsVersion(version) || !imageId || !actor ||
        reviewTerms(order) !== snapshot || (action === "return" && (!reason.trim() || reason.trim().length > 500))) return;
    let job: ReviewAttempt = { token: Symbol(), agentId, action, version, imageId, actor, buyer: order.userInfo.id, paidBefore: order.calculation?.confirmedPaidAmount ?? null, stage,
      currency: order.calculation?.currency, scale: order.calculation?.scale,
      settledVersion: store.read()?.settledVersion, reason: action === "return" ? reason.trim() : "", busy: true, blocked: true, phase: "preparing", message: "" };
    if (!store.begin(job)) return;
    try {
      const valid = () => owned(job);
      if (admin) {
        await client.fetchQuery({ queryKey: accessKey, staleTime: 0, retry: false });
        if (!valid()) throw Error();
      }
      const [row, events, clear] = await Promise.all([readOrder(valid), readHistory(valid), casesClear()]);
      if (!owned(job)) { retainOnAccessChange(job); return; }
      const baseline = lastEventId(events);
      const { state } = reviewHistory(row, events, job.buyer);
      if (!active() || reviewTerms(row) !== snapshot || !actions(row).actions.includes(action) || !clear ||
          baseline === undefined || (state !== "current" && state !== "legacy")) {
        throw Error();
      }
      job = { ...job, phase: "posting", baseline };
      store.update(job);
      if (action === "approve") await orderPaymentApi.approve(context, id, { expectedVersion: version }, scope.signal);
      else await orderPaymentApi.returnPayment(context, id, { expectedVersion: version, reason: job.reason }, scope.signal);
      if (!owned(job)) { retainOnAccessChange(job); return; }
      job = { ...job, phase: "accepted", message: "Сервер принял решение. Ожидается сверка истории и расчёта." };
    } catch (error) {
      if (job.phase === "preparing") {
        if (!owned(job)) { retainOnAccessChange(job); return; }
        store.update({ ...job, busy: false, blocked: false, phase: "done", message: "Проверьте актуальные условия, чек и обращения. Решение не отправлено." });
        return;
      }
      const rejection = reviewRejection(error, context.role);
      job = { ...job, rejection, phase: rejection ? "rejected" : "unknown",
        message: admin && rejection === "ORDER_CASE_ALREADY_OPEN"
          ? "По заказу открыто обращение. Найдите его в очереди открытых обращений ADMIN и нажмите «Проверить результат». После закрытия повторите сверку."
          : rejection ? transformToApiError(error).message : "Результат проверки платежа неизвестен. Повторная отправка заблокирована." };
    }
    if (!owned(job)) { retainOnAccessChange(job); return; }
    store.update(job);
    if (job.phase === "accepted" || job.rejection === "ORDER_TERMS_STALE") {
      await invalidateDeliveryReads(client, scope, id, context, version);
      if (!owned(job)) { retainOnAccessChange(job); return; }
    }
    await check(job);
  }
  return { attempt, otherBusy, current, currentRow: !!cachedRow(), actions: actions(order), historyOptions,
    refresh: () => Promise.all([readOrder(), readHistory(), casesClear()]), submit, actor, scopeId: scope.id,
    recheck: () => {
      const job = store.read();
      if (job?.blocked && !job.busy && owned(job)) void check(job);
    } };
}
