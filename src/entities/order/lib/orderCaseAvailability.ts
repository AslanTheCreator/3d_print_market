import type { OrderCaseDetail, OrderCaseKind } from "../model/orderCase";
import type { ListOrdersDto } from "../model/types";
import type { OrderUserRole } from "./orderStatusMeta";

export interface OrderCaseAccess {
  userId: number | null;
  role: OrderUserRole;
  // Принадлежность покупателю подтверждает scoped GET /order/customer, не поле товара.
  inOwnList: boolean;
}

export function getAvailableOrderCaseKinds(
  order: Pick<ListOrdersDto, "actualStatus" | "prepaymentAmount" | "paymentProofImageId" | "product" | "orderId">,
  cases: readonly OrderCaseDetail[],
  access: OrderCaseAccess,
): OrderCaseKind[] {
  const { userId, role, inOwnList } = access;
  if (!userId || !inOwnList || (role === "seller" ? order.product.sellerId !== userId : order.product.sellerId === userId)) return [];
  if (cases.some(detail => !detail.orderCase || !["OPEN", "RESOLVED"].includes(detail.orderCase.state ?? "") ||
    (detail.orderCase.orderId != null && detail.orderCase.orderId !== order.orderId) ||
    (detail.sellerId != null && detail.sellerId !== order.product.sellerId) ||
    (role === "customer" && detail.buyerId != null && detail.buyerId !== userId) ||
    (role === "seller" && detail.sellerId != null && detail.sellerId !== userId))) return [];
  if (cases.some(detail => detail.orderCase?.state === "OPEN")) return [];
  const kinds: OrderCaseKind[] = [];
  const proof = order.paymentProofImageId;
  // Отсутствующее поле старого DTO не означает null; images не заменяет B2.
  if (proof === null && (order.actualStatus === "AWAITING_PREPAYMENT" ||
    (order.actualStatus === "AWAITING_PAYMENT" && (order.prepaymentAmount === null || order.prepaymentAmount === 0)))) kinds.push("CANCELLATION_REQUEST");
  if (typeof proof === "number" && Number.isSafeInteger(proof) && proof > 0 &&
    ["AWAITING_PREPAYMENT_APPROVAL", "AWAITING_PAYMENT", "ASSEMBLING", "ON_THE_WAY"].includes(order.actualStatus)) kinds.push("DISPUTE");
  if (role === "customer" && order.actualStatus === "CANCELLED" &&
    cases.every(detail => !!detail.orderCase?.kind && detail.orderCase.kind !== "PAYMENT_APPEAL")) kinds.push("PAYMENT_APPEAL");
  return kinds;
}
