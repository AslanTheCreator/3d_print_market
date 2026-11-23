import { authClient } from "@/shared/api";
import { hasTermsVersion, type DeliveryTermsContext } from "../model/orderTerms";
import type { ApprovePaymentRequest, PaymentContext, PaymentStage, ReturnPaymentRequest, SubmitPaymentRequest } from "../model/orderPayment";
import { orderPath } from "./orderPath";
import { orderTextResponse } from "./orderTextResponse";

type PaymentRequest = SubmitPaymentRequest | ApprovePaymentRequest | ReturnPaymentRequest;

async function post(context: PaymentContext, orderId: number, action: string, body: PaymentRequest, signal: AbortSignal) {
  if (!hasTermsVersion(body.expectedVersion)) throw new Error("Некорректная версия условий");
  const path = orderPath(context, orderId);
  const { status, data } = await authClient.post<unknown>(`${path}/payments/${action}`, body, {
    ...orderTextResponse, signal, replayAfterRefresh: false,
  });
  // orderPath уже проверил безопасный диапазон orderId. Сравнение лексем не округляет ответ.
  const id = typeof data === "string" ? /^[ \t\r\n]*([1-9]\d*)[ \t\r\n]*$/.exec(data)?.[1] : undefined;
  if (status !== 200 || id !== String(orderId)) throw new Error("Сервер не подтвердил номер заказа");
  return orderId;
}

function requireReviewer(context: PaymentContext) {
  if (context.role !== "seller" && context.role !== "admin") throw new Error("Недоступная роль для проверки оплаты");
}

export const orderPaymentApi = {
  async submit(context: { role: "customer" }, orderId: number, stage: PaymentStage, request: SubmitPaymentRequest, signal: AbortSignal) {
    if (context.role !== "customer" || (stage !== "prepayment" && stage !== "full")) throw new Error("Недоступное предъявление оплаты");
    if (!Number.isSafeInteger(request.imageId) || request.imageId <= 0) throw new Error("Некорректный номер чека");
    const body = { expectedVersion: request.expectedVersion, imageId: request.imageId };
    return post(context, orderId, stage, body, signal);
  },
  async approve<T extends ApprovePaymentRequest>(
    context: DeliveryTermsContext, orderId: number,
    request: T & Record<Exclude<keyof T, keyof ApprovePaymentRequest>, never>, signal: AbortSignal,
  ) {
    requireReviewer(context);
    if (!request || !Object.hasOwn(request, "expectedVersion") || Reflect.ownKeys(request).length !== 1) {
      throw new Error("Для подтверждения оплаты требуется только expectedVersion");
    }
    return post(context, orderId, "review/approve", { expectedVersion: request.expectedVersion }, signal);
  },
  async returnPayment(context: DeliveryTermsContext, orderId: number, request: ReturnPaymentRequest, signal: AbortSignal) {
    requireReviewer(context);
    const reason = request.reason?.trim();
    if (!reason || reason.length > 500) throw new Error("Укажите причину возврата длиной до 500 символов");
    const body = { expectedVersion: request.expectedVersion, reason };
    return post(context, orderId, "review/return", body, signal);
  },
};
