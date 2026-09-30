import { authClient } from "@/shared/api";
import type { AdminOrderAction, AdminOrderDto, AdminOrderFilter } from "../model/admin";
export const adminOrderApi = {
  async list(filter: AdminOrderFilter, signal?: AbortSignal) {
    const url = filter.agentId ? `/admin/actions/agents/${filter.agentId}/orders` : "/admin/actions/agent-orders";
    return (await authClient.get<AdminOrderDto[]>(url, {
      params: { page: filter.page, size: 50, status: filter.status }, signal,
    })).data;
  },
  async act(agentId: number, orderId: number, action: AdminOrderAction, params: { comment?: string; deliveryUrl?: string }) {
    return (await authClient.post<number>(`/admin/actions/agents/${agentId}/orders/${orderId}/${action}`, undefined, { params })).data;
  },
  async find(agentId: number, orderId: number, signal?: AbortSignal): Promise<AdminOrderDto | null> {
    const seen = new Set<number>();
    for (let page = 0; ; page++) {
      const orders = await adminOrderApi.list({ agentId, page }, signal);
      const match = orders.find((order) => order.orderId === orderId);
      if (match) return match;
      if (orders.length < 50) return null;
      if (orders.every((order) => seen.has(order.orderId))) throw new Error("Порядок страниц изменился. Повторите проверку результата.");
      orders.forEach((order) => seen.add(order.orderId));
    }
  },
};
