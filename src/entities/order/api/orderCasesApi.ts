import { authClient } from "@/shared/api";
import type { CreateOrderCaseRequest, OrderCaseDetail } from "../model/orderCase";

export const orderCasesApi = {
  async create(request: CreateOrderCaseRequest): Promise<void> {
    const { orderId, kind, comment, imageIds } = request;
    if (!Number.isSafeInteger(orderId) || orderId <= 0 || !comment.trim()) throw new Error("Укажите заказ и непустой комментарий");
    const paths = {
      CANCELLATION_REQUEST: `/order/${orderId}/cancellation-request`,
      DISPUTE: `/order/orders/${orderId}/DISPUTED`,
      PAYMENT_APPEAL: `/order/${orderId}/payment-appeal`,
    };
    if (!Object.hasOwn(paths, kind)) throw new Error("Неизвестный вид обращения");
    if (kind === "CANCELLATION_REQUEST" && imageIds !== undefined) throw new Error("Запрос отмены не принимает изображения");
    if (imageIds?.some(id => !Number.isSafeInteger(id) || id <= 0)) throw new Error("Некорректные ID изображений");
    const params = new URLSearchParams({ comment: comment.trim() });
    imageIds?.forEach(id => params.append("imageIds", String(id)));
    // У новых POST нет подтверждённой success-схемы: результат читается через GET.
    await authClient.post(`${paths[kind]}?${params}`);
  },
  async list(orderId: number, signal?: AbortSignal): Promise<OrderCaseDetail[]> {
    if (!Number.isSafeInteger(orderId) || orderId <= 0) throw new Error("Некорректный номер заказа");
    const { data } = await authClient.get<OrderCaseDetail[]>(`/order/${orderId}/cases`, { signal });
    if (!Array.isArray(data) || data.some(detail => !detail || typeof detail !== "object" ||
      (detail.orderCase?.orderId != null && detail.orderCase.orderId !== orderId))) {
      throw new Error("Некорректный ответ истории обращений заказа");
    }
    return data;
  },
};
