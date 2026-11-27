import { getOrderPaymentBreakdown, type ListOrdersModel, type OrderTermsEvent, type PaymentStage } from "@/entities/order";
import { lastEventId, paymentSequence, paymentTerms, reviewAmountsAgree } from "./paymentEvidence";

export interface ReviewDecision {
  action: "approve" | "return";
  stage: PaymentStage;
  version: number;
  imageId: number;
  actor: number;
  buyer: number;
  paidBefore: string | null;
  currency: string | null | undefined;
  scale: number | undefined;
  reason: string;
}

export function reviewTerms(order: Parameters<typeof paymentTerms>[0] & Pick<ListOrdersModel, "orderId" | "paymentProofImageId" | "transfer">) {
  return JSON.stringify([order.orderId, paymentTerms(order), order.paymentProofImageId, order.transfer?.address]);
}

function sameAmount(a: unknown, b: unknown) {
  const normalize = (value: unknown) => typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value)
    ? value.replace(/^0+(?=\d)/, "").replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "") : undefined;
  return normalize(a) !== undefined && normalize(a) === normalize(b);
}

export function reviewEvidence(order: Pick<ListOrdersModel, "calculation" | "actualStatus" | "termsVersion" | "paymentProofImageId">,
  events: OrderTermsEvent[], decision: ReviewDecision, baseline?: number) {
  if (baseline === undefined || lastEventId(events) === undefined) return false;
  const newer = events.filter(event => event.id! > baseline).sort((a, b) => a.id! - b.id!);
  const start = newer.findIndex(event => event.expectedVersion === decision.version);
  const event = newer[start];
  if (!event || event.kind !== (decision.action === "approve" ? "PAYMENT_APPROVED" : "PAYMENT_RETURNED") ||
      event.actor !== decision.actor || event.imageId !== decision.imageId ||
      (event.kind === "PAYMENT_RETURNED" && event.reason !== decision.reason)) return false;
  if (newer.slice(0, start).some((item, index) => item.incomplete || !item.actor ||
      item.expectedVersion !== decision.version - start + index)) return false;
  const tail = newer.slice(start);
  if (!order.calculation || decision.currency !== order.calculation.currency || decision.scale !== order.calculation.scale) return false;
  if (!reviewAmountsAgree(order.calculation, tail, decision.paidBefore)) return false;
  // Следующие покупательские предъявления проверяет paymentSequence. У каждого решения должен быть автор.
  const calc = getOrderPaymentBreakdown(order);
  if (calc.prepaymentBlock) return false;
  const { totalAmount, remainingAmount, confirmedPaidAmount } = calc.amounts;
  if (totalAmount !== null && (remainingAmount === null || confirmedPaidAmount === null)) return false;
  if (["ASSEMBLING", "ON_THE_WAY", "COMPLETED"].includes(order.actualStatus) &&
      (!sameAmount(remainingAmount, "0") || !sameAmount(totalAmount, confirmedPaidAmount))) return false;
  return !!paymentSequence(order, tail, decision.stage, decision.version, decision.buyer, decision.imageId);
}
