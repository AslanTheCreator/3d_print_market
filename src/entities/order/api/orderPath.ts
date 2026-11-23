import { hasAgentId, type DeliveryHistoryContext } from "../model/orderTerms";

export function orderPath(context: DeliveryHistoryContext, orderId: number) {
  if (!Number.isSafeInteger(orderId) || orderId <= 0) throw new Error("Некорректный номер заказа");
  if (context.role === "customer" || context.role === "seller") return `/order/${orderId}`;
  if (context.role !== "admin" || !hasAgentId(context.agentId)) throw new Error("Некорректный номер агента");
  return `/admin/actions/agents/${context.agentId}/orders/${orderId}`;
}
