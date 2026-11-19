import type { ListOrdersDto } from "../model/types";
import type { OrderUserRole } from "./orderStatusMeta";

type OrderReviewFields = Pick<ListOrdersDto, "actualStatus" | "reviewId" | "canLeaveReview">;

export function getOrderReviewState(order: OrderReviewFields, role: OrderUserRole | "admin") {
  const { reviewId, canLeaveReview, actualStatus } = order;
  if (reviewId != null) return "published";
  if (role !== "customer") return "unavailable";

  if (reviewId === undefined && canLeaveReview === undefined) {
    // Старый контракт позволял открыть форму на COMPLETED, состояние отзыва неизвестно.
    return actualStatus === "COMPLETED" ? "available" : "unavailable";
  }

  return reviewId === null && canLeaveReview === true &&
    (actualStatus === "COMPLETED" || actualStatus === "FAILED")
    ? "available"
    : "unavailable";
}
