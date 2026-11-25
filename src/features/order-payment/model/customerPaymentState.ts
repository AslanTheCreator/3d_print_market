import { hashKey, type QueryClient } from "@tanstack/react-query";
import type { PrivateScope } from "@/shared/lib/query";
import type { PaymentStage } from "@/entities/order";

type Phase = "preparing" | "uploading" | "posting" | "unknown" | "accepted" | "rejected" | "verified" | "draft";
export interface Attempt {
  token: symbol;
  phase: Phase;
  busy: boolean;
  version: number;
  terms: string;
  imageId?: number;
  baseline?: number;
  proofVersion?: number;
  verifiedVersion?: number;
  rejection?: string;
  needsRead?: boolean;
  message: string;
}
export const protectedAttempt = (attempt?: Attempt) => !!attempt && (attempt.busy || !!attempt.needsRead || attempt.phase === "unknown" || attempt.phase === "accepted");

export function customerPaymentState(client: QueryClient, scope: PrivateScope, orderId: number, actor: number | undefined, stage: PaymentStage) {
  const prefix = ["customerPaymentAttempt", orderId, actor];
  const key = scope.key([...prefix, stage]);
  // Обе стадии сверяются с последней фактически прочитанной версией, как при защите F03.
  const versionKey = scope.key(["customerPaymentVersion", orderId]);
  const minimumVersion = () => client.getQueryData<number>(versionKey);
  const other = scope.key([...prefix, stage === "full" ? "prepayment" : "full"]);
  const cache = client.getQueryCache();
  const hashes = [hashKey(key), hashKey(other), hashKey(versionKey)];
  const read = () => client.getQueryData<Attempt>(key);
  const otherBusy = () => protectedAttempt(client.getQueryData<Attempt>(other));
  function write(attempt: Attempt) {
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
    begin(attempt: Attempt) {
      if (!scope.isCurrent() || protectedAttempt(read()) || otherBusy()) return false;
      write(attempt);
      return true;
    },
    update(attempt: Attempt) {
      if (scope.isCurrent() && read()?.token === attempt.token) write(attempt);
    },
    discard(token?: symbol) {
      if (scope.isCurrent() && (!token || token === read()?.token) && !protectedAttempt(read())) client.removeQueries({ queryKey: key, exact: true });
    },
  };
}
