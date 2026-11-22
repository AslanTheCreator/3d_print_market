import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { hashKey, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import type { ListOrdersModel } from "@/entities/order";
import { usePrivateScope } from "@/shared/lib/query";
import { transformToApiError } from "@/shared/lib/errorHandler";

interface Attempt {
  phase: "pending" | "unknown" | "verified";
  imageId: number;
  previousReviews: number | null;
}

function isConfirmedRejection(error: unknown) {
  const apiError = transformToApiError(error);
  const status = apiError.statusCode;
  if (status === undefined || status < 400 || status >= 500 || status === 408) return false;
  // A proxy can return a different HTTP status from the one in the error body.
  return !isAxiosError(apiError.originalError) || apiError.originalError.response?.status === status;
}

export function useCustomerPaymentAttempt(
  order: Pick<ListOrdersModel, "orderId" | "actualStatus" | "paymentProofImageId" | "histories">,
  kind: "payment" | "prepayment",
  current: boolean,
) {
  const scope = usePrivateScope();
  const client = useQueryClient();
  const key = useMemo(() => scope.key(["customerPaymentAttempt", order.orderId, kind]), [scope, order.orderId, kind]);
  const cache = client.getQueryCache();
  const hash = hashKey(key);
  const subscribe = useCallback((notify: () => void) => cache.subscribe(event => {
    if (event.query.queryHash === hash) notify();
  }), [cache, hash]);
  const read = useCallback(() => client.getQueryData<Attempt>(key), [client, key]);
  const attempt = useSyncExternalStore(subscribe, read, read);
  const reviewStatus = kind === "prepayment" ? "AWAITING_PREPAYMENT_APPROVAL" : "AWAITING_PAYMENT_APPROVAL";
  const reviewCount = () => Array.isArray(order.histories)
    ? order.histories.filter(entry => entry?.status === reviewStatus).length
    : null;
  const submittedStatus = order.actualStatus === reviewStatus || (kind === "payment" && order.actualStatus === "ASSEMBLING");
  const laterStatus = (kind === "prepayment" && ["AWAITING_PAYMENT", "AWAITING_PAYMENT_APPROVAL", "ASSEMBLING"].includes(order.actualStatus))
    || order.actualStatus === "ON_THE_WAY" || order.actualStatus === "COMPLETED";
  const matchingProof = !!attempt && order.paymentProofImageId === attempt.imageId;
  const reviews = matchingProof && laterStatus ? reviewCount() : null;
  const newReview = reviews !== null && attempt?.previousReviews != null && reviews > attempt.previousReviews;
  const received = matchingProof && (submittedStatus || newReview);

  useEffect(() => {
    if (!scope.isCurrent() || !current || !received || attempt?.phase !== "unknown" || read() !== attempt) return;
    // TanStack сохраняет максимальный gcTime записи. Уведомлению достаточно обычного срока кэша.
    client.removeQueries({ queryKey: key, exact: true });
    client.setQueryData<Attempt>(key, { ...attempt, phase: "verified" });
  }, [scope, client, key, current, attempt, received, read]);

  const blocked = () => {
    const cached = read();
    return cached?.phase === "pending" || cached?.phase === "unknown";
  };
  const begin = (imageId: number) => {
    if (!scope.isCurrent() || blocked()) return false;
    if (read()) client.removeQueries({ queryKey: key, exact: true });
    cache.build<Attempt>(client, {
      queryKey: key,
      gcTime: Infinity,
      initialData: { phase: "pending", imageId, previousReviews: reviewCount() },
    });
    return true;
  };
  const finish = (imageId: number, result: { response: unknown } | { error: unknown }) => {
    const previous = read();
    if (!scope.isCurrent() || previous?.phase !== "pending" || previous.imageId !== imageId) return false;
    const accepted = "response" in result && Number.isSafeInteger(result.response)
      && result.response === order.orderId && order.orderId > 0;
    if (accepted || ("error" in result && isConfirmedRejection(result.error))) {
      client.removeQueries({ queryKey: key, exact: true });
    } else {
      client.setQueryData<Attempt>(key, { ...previous, phase: "unknown" });
    }
    return accepted;
  };
  const verified = current && received && attempt?.phase === "verified";
  return { phase: attempt?.phase, verified, begin, finish, blocked };
}
