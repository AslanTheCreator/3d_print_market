import { getSafeCaseTelegramUrl, type OrderCaseDetail, type OrderCaseResolutionOutcome } from "@/entities/order";
import { transformToApiError } from "@/shared/lib/errorHandler";

export type CaseCommand = { caseId: number } & (
  | { kind: "resolve"; outcome: OrderCaseResolutionOutcome; comment: string }
  | { kind: "telegram"; url: string }
);
export type CaseAttempt = CaseCommand & { status: "accepted" | "unknown" | "rejected" | "conflict"; checked: boolean; synced: boolean; terminal?: boolean };
export function matchesCaseAttempt(detail: OrderCaseDetail, attempt: CaseCommand) {
  if (detail.orderCase?.id !== attempt.caseId) return false;
  return attempt.kind === "telegram" ? getSafeCaseTelegramUrl(detail.orderCase.telegramUrl) === attempt.url
    : detail.orderCase.state === "RESOLVED" && detail.orderCase.outcome === attempt.outcome && detail.orderCase.resolutionComment === attempt.comment;
}
export function getAdminCaseFailure(error: unknown) {
  const api = transformToApiError(error);
  const messages: Record<string, string> = {
    ORDER_CASE_ALREADY_RESOLVED: "Другой администратор уже завершил обращение. Перечитываем решение.",
    ORDER_CASE_INVALID_TRANSITION: "Состояние или версия обращения изменились. Перечитываем детали.",
    ORDER_CASE_INVALID_OUTCOME: "Этот исход недопустим для обращения. Перечитываем доступные решения.",
  };
  const rejected = !!api.statusCode && api.statusCode >= 400 && api.statusCode < 500 && api.statusCode !== 408;
  return { status: rejected ? "rejected" as const : "unknown" as const, terminal: api.code === "ORDER_CASE_ALREADY_RESOLVED",
    message: messages[api.code ?? ""] ?? (rejected ? api.message : "Ответ не получен. Результат операции неизвестен; повторная отправка заблокирована.") };
}
