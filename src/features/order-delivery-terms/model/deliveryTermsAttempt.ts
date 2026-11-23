import { isAxiosError } from "axios";
import { hashKey, type QueryClient } from "@tanstack/react-query";
import type { PrivateScope } from "@/shared/lib/query";
import { transformToApiError } from "@/shared/lib/errorHandler";
import { editableDeliveryStatus, getOrderPaymentBreakdown, hasTermsVersion, type DeliveryTermsContext, type TermsOrder } from "@/entities/order";

export interface Attempt {
  phase: "pending" | "accepted" | "unknown" | "stale" | "blocked" | "idle";
  version: number;
  message: string;
  readError?: string;
  busy: boolean;
}

export function deliveryAttemptState(client: QueryClient, scope: PrivateScope, orderId: number, context: DeliveryTermsContext) {
  const key = scope.key(["deliveryAttempt", context.role, ...(context.role === "admin" ? [context.agentId] : []), orderId]);
  const cache = client.getQueryCache();
  const hash = hashKey(key);
  const read = () => client.getQueryData<Attempt>(key);
  return {
    read,
    subscribe: (notify: () => void) => cache.subscribe(event => { if (event.query.queryHash === hash) notify(); }),
    write(value: Attempt) {
      if (!scope.isCurrent()) return;
      const previous = read();
      const protect = value.busy || value.phase !== "idle";
      if (previous && protect === (previous.busy || previous.phase !== "idle")) {
        client.setQueryData(key, value);
        return;
      }
      // TanStack сохраняет максимальный gcTime. При смене режима создаём запись с нужным сроком.
      if (previous) client.removeQueries({ queryKey: key, exact: true });
      cache.build<Attempt>(client, { queryKey: key, initialData: value, ...(protect && { gcTime: Infinity }) });
    },
  };
}

export function allowsDeliveryCost(order: TermsOrder, unknown: boolean) {
  return !unknown || /^0+(?:\.0+)?$/.test(order.calculation?.confirmedPaidAmount ?? "");
}

export function deliveryBlock(order: TermsOrder) {
  if (!editableDeliveryStatus(order.actualStatus)) return "Изменение недоступно в текущем статусе";
  if (!hasTermsVersion(order.termsVersion)) return "Версия условий не получена";
  return getOrderPaymentBreakdown(order).message;
}

export function deliveryFingerprint(order: TermsOrder) {
  return JSON.stringify([order.actualStatus, order.deliveryCarrier, order.deliveryAddress, getOrderPaymentBreakdown(order).fingerprint]);
}

export function deliveryFailure(error: unknown): Pick<Attempt, "phase" | "message"> {
  const api = transformToApiError(error);
  const status = api.statusCode;
  if (!status || status < 400 || status >= 500 || status === 408 ||
      (isAxiosError(api.originalError) && api.originalError.response?.status !== status)) {
    return { phase: "unknown", message: "Результат изменения неизвестен. Проверьте актуальные условия." };
  }
  if (status === 409 && api.code === "ORDER_TERMS_STALE") return { phase: "stale", message: "Условия изменились. Черновик сохранён." };
  const messages: Record<string, string> = {
    ORDER_CASE_ALREADY_OPEN: "По заказу открыто обращение. Черновик сохранён.",
    ORDER_LEGACY_RECONCILIATION_REQUIRED: "Заказ требует сверки администратором",
    ORDER_NOT_FOUND: "Заказ не найден",
    ACCESS_DENIED: "Нет доступа к изменению заказа",
    INVALID_TRANSFER: "Проверьте службу и адрес доставки",
    ORDER_PAYMENT_INVALID: "Проверьте этап заказа и стоимость доставки с учётом уже оплаченной суммы",
  };
  return { phase: status === 401 || status === 403 || status === 404 || status === 409 ? "blocked" : "idle",
    message: messages[api.code ?? ""] ?? api.message };
}
