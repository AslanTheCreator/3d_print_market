import type { DeliveryCarrier, ListOrdersDto } from "./types";

export type DeliveryTermsContext = { role: "admin"; agentId: number } | { role: "seller" };
export type DeliveryHistoryContext = DeliveryTermsContext | { role: "customer" };

export function hasAgentId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
export type TermsOrder = Pick<ListOrdersDto, "orderId" | "actualStatus" | "deliveryCarrier" | "deliveryAddress" | "termsVersion" | "calculation">;
export interface DeliveryTermsRequest {
  expectedVersion: number;
  carrier: DeliveryCarrier;
  address: string;
  deliveryAmount: string | null;
  reason?: string;
}

export function hasTermsVersion(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
export function editableDeliveryStatus(status: TermsOrder["actualStatus"]) {
  return status === "BOOKED" || status === "AWAITING_PREPAYMENT" || status === "AWAITING_PAYMENT";
}
export function normalizeDeliveryAmount(input: string): string | undefined {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(input.trim());
  if (!match) return undefined;
  const integer = match[1].replace(/^0+(?=\d)/, "");
  if (integer.length > 17) return undefined;
  return integer + "." + (match[2] ?? "").padEnd(2, "0");
}
