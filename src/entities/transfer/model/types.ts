import type { Currency } from "@/shared/types";

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

// Модель для создания/обновления — отправляем на сервер
export interface TransferInput {
  sending: ShippingMethod;
  price: number;
  currency: Currency;
}
