import { getOrderReviewState, type ListOrdersDto } from "@/entities/order";

export type ReviewRecovery = {
  reason: "accepted" | "duplicate" | "not-terminated" | "unknown";
  previousOrder: Pick<ListOrdersDto, "actualStatus" | "canLeaveReview" | "reviewId">;
};

export function hasOrderReviewFields(order: ReviewRecovery["previousOrder"]) {
  return typeof order.canLeaveReview === "boolean" &&
    (order.reviewId === null || typeof order.reviewId === "number");
}

export function resolveReviewCheck(order: ReviewRecovery["previousOrder"] | undefined, recovery: ReviewRecovery, confirmedRead: boolean) {
  if (!order) return "needs-check";
  if (order.reviewId != null) return "idle";

  if (hasOrderReviewFields(order)) {
    if (getOrderReviewState(order, "customer") !== "available") return "idle";
    const previous = recovery.previousOrder;
    const matchesRequest = order.actualStatus === previous.actualStatus &&
      order.reviewId === previous.reviewId && order.canLeaveReview === previous.canLeaveReview;
    // Первый ответ, противоречащий результату POST, может повторять старую выдачу.
    return recovery.reason === "unknown" || confirmedRead || !matchesRequest ? "idle" : "needs-check";
  }

  const legacy = order.reviewId === undefined && order.canLeaveReview === undefined;
  if (legacy && recovery.reason === "accepted") return "legacy-published";
  if (legacy && recovery.reason === "not-terminated" && order.actualStatus !== "COMPLETED") {
    return "idle";
  }
  return "needs-check";
}
