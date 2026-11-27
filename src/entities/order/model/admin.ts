import type { ListOrdersDto, OrderStatus } from "./types";
export interface AdminOrderDto extends Omit<ListOrdersDto, "histories"> {
  sellerId: number;
  sellerLogin: string;
  histories: { status: OrderStatus; comment: string | null; changedAt: string }[];
}
export type AdminOrderAction = "CONFIRM" | "SHIP" | "CANCEL";
export interface AdminOrderFilter { agentId?: number; status?: OrderStatus; page: number }
export const adminOrderStatuses: readonly OrderStatus[] = ["BOOKED", "AWAITING_PREPAYMENT", "AWAITING_PREPAYMENT_APPROVAL", "AWAITING_PAYMENT", "AWAITING_PAYMENT_APPROVAL", "ASSEMBLING", "ON_THE_WAY", "DISPUTED", "COMPLETED", "CANCELLED", "FAILED"];
