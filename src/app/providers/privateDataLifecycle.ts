import type { QueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/entities/session";
import type { createPrivateScope } from "@/shared/lib/query";

export function bindPrivateDataLifecycle(
  client: QueryClient,
  scope: ReturnType<typeof createPrivateScope>,
  clearProjection: () => void,
  clearDraft: () => void,
) {
  clearProjection();
  return useAuthStore.subscribe((state, previous) => {
    if (state.accountRevision === previous.accountRevision && state.isAuthenticated === previous.isAuthenticated) return;
    scope.dispose();
    const filters = { predicate: (query: { queryKey: readonly unknown[] }) =>
      query.queryKey[0] === "private" || query.queryKey[0] === "admin" };
    void client.cancelQueries(filters);
    client.removeQueries(filters);
    clearProjection();
    // Initial cookie restoration is not a logout: disk drafts are checked by profile ID.
    if (previous.isInitialized || !state.isAuthenticated) clearDraft();
  });
}
