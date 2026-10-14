import type { OrderStatus } from "./types";

export type OrderCaseKind = "CANCELLATION_REQUEST" | "DISPUTE" | "PAYMENT_APPEAL";
export type OrderCaseState = "OPEN" | "RESOLVED";
export type OrderCaseOutcome = "BUYER" | "SELLER" | "CANCELLED" | "REJECTED" | "LEGACY";
export type OrderCaseResolutionOutcome = Exclude<OrderCaseOutcome, "LEGACY">;

// OpenAPI не задаёт required; отсутствие полей и null не заменяются значениями по умолчанию.
export interface OrderCase {
  id?: number | null;
  version?: number | null;
  orderId?: number | null;
  kind?: OrderCaseKind | null;
  state?: OrderCaseState | null;
  openedBy?: number | null;
  openingComment?: string | null;
  previousOrderStatus?: OrderStatus | null;
  telegramUrl?: string | null;
  resolvedBy?: number | null;
  outcome?: OrderCaseOutcome | null;
  resolutionComment?: string | null;
  createdAt?: string | null;
  resolvedAt?: string | null;
}

export interface OrderCaseDetail {
  orderCase?: OrderCase | null;
  orderStatus?: OrderStatus | null;
  buyerId?: number | null;
  sellerId?: number | null;
  productId?: number | null;
  count?: number | null;
  totalPrice?: number | null;
  prepaymentAmount?: number | null;
  paymentProofImageId?: number | null;
  orderImages?: number[] | null;
  caseImages?: number[] | null;
}

export interface OrderCaseSummary {
  caseId?: number | null;
  orderId?: number | null;
  kind?: OrderCaseKind | null;
  state?: OrderCaseState | null;
  openedBy?: number | null;
  openingComment?: string | null;
  createdAt?: string | null;
  orderStatus?: OrderStatus | null;
}

// Параметры query; caseId передаётся отдельно в path. LEGACY допустим только при чтении.
export interface ResolveOrderCaseRequest {
  outcome: OrderCaseResolutionOutcome;
  comment: string;
}
