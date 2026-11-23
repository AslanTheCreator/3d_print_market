import { getOrderPaymentBreakdown } from "../lib/orderPaymentBreakdown";
import { hasAgentId, type DeliveryHistoryContext } from "./orderTerms";
import type { ListOrdersDto } from "./types";

export type PaymentContext = DeliveryHistoryContext;
export type PaymentStage = "prepayment" | "full";
export interface ApprovePaymentRequest {
  expectedVersion: number;
  reason?: never;
  imageId?: never;
}
export interface SubmitPaymentRequest {
  expectedVersion: number;
  imageId: number;
}
export interface ReturnPaymentRequest {
  expectedVersion: number;
  reason: string;
}

type PaymentOrder = Pick<ListOrdersDto,
  "orderId" | "actualStatus" | "termsVersion" | "calculation" | "paymentProofImageId"
> & { sellerId?: number };
type PaymentAction = "submit" | "approve" | "return";

export function getOrderPaymentActions(order: PaymentOrder, context: PaymentContext, access: {
  current: boolean;
  hasOpenCase: boolean;
  attemptBlocked: boolean;
}): { stage: PaymentStage | null; actions: PaymentAction[] } {
  const unavailable = { stage: null, actions: [] };
  if (!access.current || access.hasOpenCase || access.attemptBlocked) return unavailable;
  if (!Number.isSafeInteger(order.orderId) || order.orderId <= 0) return unavailable;
  if (context.role === "admin" && (!hasAgentId(context.agentId) || context.agentId !== order.sellerId)) return unavailable;
  const calculation = getOrderPaymentBreakdown(order);
  if (calculation.prepaymentBlock) return unavailable;
  if (context.role === "customer") {
    if (order.actualStatus === "AWAITING_PREPAYMENT") return { stage: "prepayment", actions: ["submit"] };
    if (order.actualStatus === "AWAITING_PAYMENT" && !calculation.paymentBlock) return { stage: "full", actions: ["submit"] };
    return unavailable;
  }
  if (context.role !== "seller" && context.role !== "admin") return unavailable;
  if (!Number.isSafeInteger(order.paymentProofImageId) || (order.paymentProofImageId ?? 0) <= 0) return unavailable;
  if (order.actualStatus === "AWAITING_PREPAYMENT_APPROVAL") return { stage: "prepayment", actions: ["approve", "return"] };
  if (order.actualStatus === "AWAITING_PAYMENT_APPROVAL") {
    return { stage: "full", actions: calculation.paymentBlock ? ["return"] : ["approve", "return"] };
  }
  return unavailable;
}
