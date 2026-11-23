import { authClient } from "@/shared/api";
import { decodeTermsHistory } from "../lib/orderTermsHistory";
import { hasAgentId, type DeliveryHistoryContext, type DeliveryTermsContext, type DeliveryTermsRequest } from "../model/orderTerms";

function orderPath(context: DeliveryHistoryContext, orderId: number) {
  if (!Number.isSafeInteger(orderId) || orderId <= 0) throw new Error("Некорректный номер заказа");
  if (context.role !== "admin") return `/order/${orderId}`;
  if (!hasAgentId(context.agentId)) throw new Error("Некорректный номер агента");
  return `/admin/actions/agents/${context.agentId}/orders/${orderId}`;
}
export const orderTermsApi = {
  async history(context: DeliveryHistoryContext, orderId: number, signal: AbortSignal) {
    const { data } = await authClient.get<unknown>(orderPath(context, orderId) + "/terms-history", { signal });
    return decodeTermsHistory(data);
  },
  async update(context: DeliveryTermsContext, orderId: number, body: DeliveryTermsRequest, signal: AbortSignal) {
    const url = orderPath(context, orderId);
    const { data, status } = await authClient.put<unknown>(url + "/delivery", body, { signal, replayAfterRefresh: false });
    if (status !== 200 || data !== orderId) throw new Error("Сервер не подтвердил номер заказа");
  },
};
