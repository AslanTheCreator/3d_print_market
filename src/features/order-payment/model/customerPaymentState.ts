import type { QueryClient } from "@tanstack/react-query";
import type { PrivateScope } from "@/shared/lib/query";
import { orderQueryKeys, type PaymentStage } from "@/entities/order";

import { paymentAttemptStore } from "./paymentAttemptStore";

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

export function customerPaymentState(client: QueryClient, scope: PrivateScope, orderId: number, agentId: number, actor: number | undefined, stage: PaymentStage) {
  const prefix = ["customerPaymentAttempt", orderId, actor];
  const key = scope.key([...prefix, stage]);
  const other = scope.key([...prefix, stage === "full" ? "prepayment" : "full"]);
  const adminReview = scope.key(orderQueryKeys.adminReviewAttempt(agentId, orderId));
  return paymentAttemptStore(client, scope, orderId, agentId, key, [other, adminReview], protectedAttempt,
    () => protectedAttempt(client.getQueryData<Attempt>(other)) || !!client.getQueryData<{ blocked: boolean }>(adminReview)?.blocked);
}
