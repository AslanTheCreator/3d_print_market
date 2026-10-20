import { skipToken, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { adminGiveawayApi } from "../api/adminGiveawayApi";

export const adminGiveawayKeys = {
  histories: (session: number | null) => ["admin", session, "giveaways", "history"] as const,
  history: (session: number | null, page: number) => [...adminGiveawayKeys.histories(session), page] as const,
  detail: (session: number | null, id: number) => ["admin", session, "giveaways", "detail", id] as const,
};
export function hasAdminGiveawayAccess(client: QueryClient, session: number | null) {
  const access = client.getQueryState<{ role?: string }>(["admin", session, "access"]);
  return session !== null && access?.status === "success" && access.data?.role === "ADMIN";
}
export function useAdminGiveawayHistory(session: number | null, page: number) {
  const client = useQueryClient(); const allowed = useGiveawayAccess(session);
  return useQuery({ queryKey: adminGiveawayKeys.history(session, page),
    queryFn: ({ signal }) => {
      if (!hasAdminGiveawayAccess(client, session)) throw new Error("Доступ ADMIN не подтверждён");
      return adminGiveawayApi.history(page, signal);
    }, enabled: allowed, staleTime: 0, refetchOnMount: "always", retry: false });
}
export function useAdminGiveaway(session: number | null, id: number) {
  const client = useQueryClient(); const allowed = useGiveawayAccess(session);
  return useQuery({ queryKey: adminGiveawayKeys.detail(session, id), queryFn: ({ signal }) => {
    if (!hasAdminGiveawayAccess(client, session)) throw new Error("Доступ ADMIN не подтверждён");
    return adminGiveawayApi.detail(id, signal);
  }, enabled: allowed && Number.isSafeInteger(id) && id > 0, staleTime: 0, refetchOnMount: "always", retry: false });
}
function useGiveawayAccess(session: number | null) {
  const access = useQuery<{ role?: string }>({ queryKey: ["admin", session, "access"], queryFn: skipToken, enabled: false });
  return session !== null && access.isSuccess && access.data?.role === "ADMIN";
}
