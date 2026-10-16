import type { OrderCaseDetail, OrderCaseResolutionOutcome } from "../model/orderCase";

export function getAdminOrderCaseOutcomes(detail: OrderCaseDetail): OrderCaseResolutionOutcome[] {
  const item = detail.orderCase;
  if (item?.state !== "OPEN" || item.outcome === "LEGACY") return [];
  switch (item.kind) {
    case "CANCELLATION_REQUEST": return ["CANCELLED", "REJECTED"];
    case "DISPUTE": return item.previousOrderStatus === "ON_THE_WAY" ? ["BUYER", "SELLER"] : ["BUYER"];
    case "PAYMENT_APPEAL": return ["BUYER", "SELLER"];
    default: return [];
  }
}
