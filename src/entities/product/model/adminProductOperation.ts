import type { QueryClient } from "@tanstack/react-query";

export const adminProductOperationKeys = {
  product: (session: number | null, id: number) => ["admin", session, "product-operation", id] as const,
  settings: (session: number | null, id: number) => ["admin", session, "giveaway-operation", id] as const,
  status: (session: number | null, id: number) => ["admin", session, "product-status-operation", id] as const,
};
export function hasOtherAdminProductWrite(client: QueryClient, session: number | null, id: number, editor: keyof typeof adminProductOperationKeys) {
  return (Object.keys(adminProductOperationKeys) as (keyof typeof adminProductOperationKeys)[]).some(source => {
    if (source === editor) return false;
    const state = client.getQueryData<{ busy: boolean; attempt?: unknown }>(adminProductOperationKeys[source](session, id));
    return !!(state?.busy || state?.attempt);
  });
}
