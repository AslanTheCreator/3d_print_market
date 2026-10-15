import { authClient } from "@/shared/api";
import type { OrderCaseDetail } from "../model/orderCase";

export const orderCasesApi = {
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
