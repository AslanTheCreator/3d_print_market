import { hasTermsVersion, getOrderPaymentBreakdown, type ListOrdersModel, type OrderTermsEvent, type PaymentStage } from "@/entities/order";

type Terms = Pick<ListOrdersModel, "actualStatus" | "calculation" | "termsVersion" | "deliveryAddress" | "deliveryCarrier"> & {
  product: { sellerId: number }; userInfo: { id: number };
};
export function paymentTerms(order: Terms) {
  return JSON.stringify([getOrderPaymentBreakdown(order).fingerprint, order.actualStatus, order.deliveryCarrier, order.deliveryAddress, order.product.sellerId, order.userInfo.id]);
}

export function lastEventId(events: OrderTermsEvent[] | undefined) {
  if (!events || events.some(event => event.id === undefined) || new Set(events.map(event => event.id)).size !== events.length) return undefined;
  return events.reduce((max, event) => Math.max(max, event.id!), 0);
}

type ControlOrder = Pick<ListOrdersModel, "actualStatus" | "termsVersion" | "paymentProofImageId">;
type Outcome = "pending" | "approved" | "returned";

export function paymentEvidence(order: ControlOrder, events: OrderTermsEvent[], stage: PaymentStage,
  version: number, imageId: number, actor: number, baseline?: number): Outcome | false {
  if (!hasTermsVersion(order.termsVersion) || baseline === undefined || lastEventId(events) === undefined) return false;
  const newer = events.filter(event => event.id! > baseline).sort((a, b) => a.id! - b.id!);
  const start = newer.findIndex(event => event.kind === "PAYMENT_SUBMITTED" && event.imageId === imageId &&
    event.expectedVersion === version && event.actor === actor);
  if (start < 0) return false;
  // Исходный GET истории мог отставать от заказа. Допустим только однозначный префикс старших ID до исходной версии.
  if (newer.slice(0, start).some((event, index) => event.incomplete || !event.actor ||
      event.expectedVersion !== version - start + index)) return false;

  let nextVersion = version;
  let pending: number | undefined;
  let outcome: Outcome = "pending";
  let completed = false;
  for (const event of newer.slice(start)) {
    if (completed || event.incomplete || !event.actor || event.expectedVersion !== nextVersion) return false;
    if (event.kind === "DELIVERY_CHANGED") {
      if (pending !== undefined) return false;
    } else {
      if (!event.imageId) return false;
      if (event.kind === "PAYMENT_SUBMITTED") {
        if (pending !== undefined || event.actor !== actor) return false;
        pending = event.imageId;
      } else {
        if (pending !== event.imageId) return false;
        pending = undefined;
        if (outcome === "pending") outcome = event.kind === "PAYMENT_APPROVED" ? "approved" : "returned";
        if (event.kind === "PAYMENT_APPROVED") {
          completed = stage === "full";
          stage = "full";
        }
      }
    }
    nextVersion++;
  }
  if (order.termsVersion !== nextVersion) return false;
  if (completed) return ["ASSEMBLING", "ON_THE_WAY", "COMPLETED"].includes(order.actualStatus) && outcome;
  const awaiting = stage === "full" ? "AWAITING_PAYMENT" : "AWAITING_PREPAYMENT";
  if (pending !== undefined) return order.actualStatus === awaiting + "_APPROVAL" && order.paymentProofImageId === pending && outcome;
  return order.actualStatus === awaiting && outcome;
}

// Оба снимка допускают предъявление на той же стадии. За один переход полный цикл submit/return невозможен.
export function sameProofCycle(events: OrderTermsEvent[] | undefined, selected: number, current: number) {
  if (current === selected || current === selected + 1) return true;
  if (current < selected || !events || lastEventId(events) === undefined) return false;
  const changes = events.filter(event => event.expectedVersion !== undefined && event.expectedVersion >= selected)
    .sort((a, b) => a.id! - b.id!);
  return changes.length === current - selected && changes.every((event, index) =>
    event.kind === "DELIVERY_CHANGED" && !event.incomplete && !!event.actor && event.expectedVersion === selected + index);
}

export function latestReturn(events: OrderTermsEvent[] | undefined, order: ControlOrder, stage: PaymentStage, actor?: number) {
  if (!events || !actor || lastEventId(events) === undefined) return;
  const payments = events.filter(event => event.kind !== "DELIVERY_CHANGED").sort((a, b) => b.id! - a.id!);
  const [returned, submission] = payments;
  if (returned?.kind !== "PAYMENT_RETURNED" || submission?.kind !== "PAYMENT_SUBMITTED" ||
      submission.expectedVersion === undefined || !submission.imageId) return;
  if (paymentEvidence(order, events, stage, submission.expectedVersion, submission.imageId, actor, submission.id! - 1) === "returned") return returned;
}
