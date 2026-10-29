import type { OrderCaseDetail, OrderCaseKind } from "@/entities/order";
import { transformToApiError } from "@/shared/lib/errorHandler";

export function getOrderCaseFailure(error: unknown) {
  const api = transformToApiError(error);
  const messages: Record<string, string> = {
    ORDER_CASE_ALREADY_OPEN: "По заказу уже открыто обращение. Обновляем заказ и историю.",
    PAYMENT_APPEAL_ALREADY_EXISTS: "Обращение об оплате после отмены уже создавалось, в том числе могло быть завершено.",
    ORDER_CASE_INVALID_TRANSITION: "Статус заказа, подтверждение оплаты или состояние обращения изменились. Обновляем данные.",
    BAD_REQUEST: "Проверьте непустой комментарий и данные обращения.",
    INVALID_REQUEST: "Данные обращения не прошли проверку. Проверьте введённые значения.",
  };
  const rejected = !!api.statusCode && api.statusCode >= 400 && api.statusCode < 500 && api.statusCode !== 408;
  return {
    outcome: rejected ? "rejected" as const : "unknown" as const,
    message: messages[api.code ?? ""] ?? (rejected ? api.message : "Результат отправки неизвестен. Проверяем заказ и историю; повторная отправка заблокирована."),
  };
}

export function hasCreatedOrderCase(cases: readonly OrderCaseDetail[], baselineIds: readonly number[], kind: OrderCaseKind, comment: string, userId: number) {
  return cases.some(({ orderCase }) => typeof orderCase?.id === "number" && Number.isSafeInteger(orderCase.id) && orderCase.id > 0 && !baselineIds.includes(orderCase.id) &&
    orderCase.kind === kind && orderCase.openedBy === userId && orderCase.openingComment === comment.trim());
}
