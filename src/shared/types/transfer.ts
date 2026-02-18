import { Currency } from "./currency";

export type ShippingMethod =
  | "PRODUCT_PICKUP"
  | "TRANSPORT_COMPANY"
  | "RUSSIAN_POST"
  | "FREE_POST";

export type TransferStatus = "ACTIVE" | "DELETED";

export interface Transfer {
  id: number;
  sending: ShippingMethod;
  price: number;
  currency: Currency;
  participantId: number;
  status: TransferStatus;
}
