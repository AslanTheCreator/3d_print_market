import { usePrivateScope } from "@/shared/lib/query";
import { hasCurrentDeliveryVersion } from "./orderTermsQueries";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminOrderApi } from "../api/adminOrderApi";
import type { AdminOrderFilter } from "./admin";
export const adminOrderKeys = {
  located: (session: number | null, agentId?: number, orderId?: number) => ["admin", session, "orders", "located", agentId, orderId] as const,
  history: (session: number | null, agentId: number, orderId: number) => ["admin", session, "terms-history", agentId, orderId] as const,
  all: (session: number | null) => ["admin", session, "orders"] as const,
  list: (session: number | null, filter: AdminOrderFilter) => ["admin", session, "orders", filter] as const,
};
export function useAdminOrders(session: number | null, filter: AdminOrderFilter) {
  const client = useQueryClient();
  const scope = usePrivateScope();
  return useQuery({
    queryKey: adminOrderKeys.list(session, filter), queryFn: ({ signal }) => adminOrderApi.list(filter, signal),
    enabled: session !== null, retry: false,
    select: rows => rows.map(row => hasCurrentDeliveryVersion(client, scope, row) ? row : { ...row, calculation: null }),
  });
}
