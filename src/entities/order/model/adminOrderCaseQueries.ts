import { skipToken, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { adminOrderCasesApi } from "../api/adminOrderCasesApi";
import type { OrderCaseState } from "./orderCase";

export const adminOrderCaseKeys = {
  lists: (session: number | null) => ["admin", session, "order-cases", "list"] as const,
  list: (session: number | null, state: OrderCaseState, page: number) => [...adminOrderCaseKeys.lists(session), state, page] as const,
  detail: (session: number | null, caseId: number) => ["admin", session, "order-cases", "detail", caseId] as const,
};
export function hasAdminOrderCaseAccess(client: QueryClient, session: number | null) {
  const access = client.getQueryState<{ role?: string }>(["admin", session, "access"]);
  return session !== null && access?.status === "success" && access.data?.role === "ADMIN";
}
function useCaseAccess(session: number | null) {
  // Наблюдаем проверку AdminAccess, не запускаем второй запрос профиля.
  const access = useQuery<{ role?: string }>({ queryKey: ["admin", session, "access"], queryFn: skipToken, enabled: false });
  return session !== null && access.isSuccess && access.data?.role === "ADMIN";
}
export function useAdminOrderCases(session: number | null, state: OrderCaseState, page: number) {
  const client = useQueryClient(); const allowed = useCaseAccess(session);
  return useQuery({ queryKey: adminOrderCaseKeys.list(session, state, page),
    queryFn: ({ signal }) => {
      if (!hasAdminOrderCaseAccess(client, session)) throw new Error("Доступ ADMIN не подтверждён");
      return adminOrderCasesApi.list(state, page, signal);
    }, enabled: allowed, retry: false, staleTime: 0, refetchOnMount: "always",
  });
}
export function useAdminOrderCaseDetail(session: number | null, caseId: number) {
  const client = useQueryClient(); const allowed = useCaseAccess(session);
  return useQuery({ queryKey: adminOrderCaseKeys.detail(session, caseId),
    queryFn: ({ signal }) => {
      if (!hasAdminOrderCaseAccess(client, session)) throw new Error("Доступ ADMIN не подтверждён");
      return adminOrderCasesApi.detail(caseId, signal);
    }, enabled: allowed && Number.isSafeInteger(caseId) && caseId > 0, retry: false, staleTime: 0, refetchOnMount: "always",
  });
}
