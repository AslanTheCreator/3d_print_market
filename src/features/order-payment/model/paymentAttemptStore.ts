import { hashKey, type QueryClient, type QueryKey } from "@tanstack/react-query";
import type { PrivateScope } from "@/shared/lib/query";

export function paymentAttemptStore<T extends { token: symbol }>(client: QueryClient, scope: PrivateScope,
  orderId: number, agentId: number, key: QueryKey, related: QueryKey[], protectedAttempt: (attempt?: T) => boolean, otherBusy: () => boolean) {
  // Обе стадии сверяются с последней фактически прочитанной версией, как при защите F03.
  const versionKey = scope.key(["customerPaymentVersion", agentId, orderId]);
  const minimumVersion = () => client.getQueryData<number>(versionKey);
  const cache = client.getQueryCache();
  const hashes = [hashKey(key), ...related.map(hashKey), hashKey(versionKey)];
  const read = () => client.getQueryData<T>(key);
  function write(attempt: T) {
    if (protectedAttempt(read()) !== protectedAttempt(attempt)) client.removeQueries({ queryKey: key, exact: true });
    cache.build(client, { queryKey: key, ...(protectedAttempt(attempt) && { gcTime: Infinity }) });
    client.setQueryData(key, attempt);
  }
  return {
    read, otherBusy, minimumVersion,
    confirmVersion(version: number) {
      if (!scope.isCurrent() || !Number.isSafeInteger(version) || version < 0) return;
      cache.build(client, { queryKey: versionKey, gcTime: Infinity });
      client.setQueryData<number>(versionKey, previous => Math.max(previous ?? version, version));
    },
    subscribe: (notify: () => void) => cache.subscribe(e => { if (hashes.includes(e.query.queryHash)) notify(); }),
    begin(attempt: T) {
      if (!scope.isCurrent() || protectedAttempt(read()) || otherBusy()) return false;
      write(attempt);
      return true;
    },
    update(attempt: T) {
      if (scope.isCurrent() && read()?.token === attempt.token) write(attempt);
    },
    discard(token?: symbol) {
      if (scope.isCurrent() && (!token || token === read()?.token) && !protectedAttempt(read())) client.removeQueries({ queryKey: key, exact: true });
    },
  };
}
