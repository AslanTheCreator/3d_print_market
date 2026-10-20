import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminProductApi } from "../api/adminProductApi";
import { adminGiveawayKeys } from "./adminGiveawayQueries";
import type { AdminProductDto } from "./admin";
import type { AdminGiveawayProductResponse } from "./giveaway";
import { adminProductOperationKeys } from "./adminProductOperation";

// Очередь общая для списков: одновременно не более четырёх запросов ботов.
let running = 0;
const queue: (() => void)[] = [];
async function limited<T>(task: () => Promise<T>): Promise<T> {
  if (running >= 4) await new Promise<void>((resolve) => queue.push(resolve));
  else running++;
  try { return await task(); }
  finally { const next = queue.shift(); if (next) next(); else running--; }
}
export const adminProductKeys = {
  all: (session: number | null) => ["admin", session, "products"] as const,
  list: (session: number | null, agent: number) => ["admin", session, "products", "agent", agent] as const,
  detail: (session: number | null, id: number) => ["admin", session, "products", "detail", id] as const,
  relations: (session: number | null, id: number) => ["admin", session, "products", "relations", id] as const,
};
export function useAdminProductLists(session: number | null, agents: number[]) {
  return useQueries({ queries: agents.map((id) => ({
    queryKey: adminProductKeys.list(session, id),
    queryFn: ({ signal }: { signal: AbortSignal }) => limited(() => {
      signal.throwIfAborted();
      return adminProductApi.list(id, signal);
    }), enabled: session !== null, retry: false,
  })) });
}
export function useAdminProduct(session: number | null, id: number) {
  return useQuery({ queryKey: adminProductKeys.detail(session, id),
    queryFn: ({ signal }) => adminProductApi.get(id, signal), enabled: session !== null && id > 0, staleTime: 0, refetchOnMount: "always", retry: false });
}
export function useAdminProductRelations(session: number | null, id: number, enabled = true, giveaway = false) {
  const client = useQueryClient();
  return useQuery({ queryKey: adminProductKeys.relations(session, id),
    queryFn: ({ signal }) => adminProductApi.relations(id, signal, giveaway ||
      client.getQueryData<AdminProductDto>(adminProductKeys.detail(session, id))?.availability === "GIVEAWAY" ||
      client.getQueryData<{ attempt?: { status: string; input: { availability: string } } }>(adminProductOperationKeys.product(session, id))?.attempt?.status === "accepted" &&
      client.getQueryData<{ attempt?: { input: { availability: string } } }>(adminProductOperationKeys.product(session, id))?.attempt?.input.availability === "GIVEAWAY" ||
      client.getQueryData<AdminGiveawayProductResponse>(adminGiveawayKeys.detail(session, id))?.product?.availability === "GIVEAWAY"),
    enabled: session !== null && id > 0 && enabled, staleTime: 0, refetchOnMount: "always", retry: false });
}
