import { Currency } from "@/shared/types";

// Методы доставки
export type ShippingMethod =
  | "PRODUCT_PICKUP"
  | "TRANSPORT_COMPANY"
  | "RUSSIAN_POST"
  | "FREE_POST";

// Статус записи (используется сервером)
export type TransferStatus = "ACTIVE" | "DELETED";

// Базовая модель — то, что приходит с сервера
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

// Для UI формы — расширяем входные данные флагом активности
export interface TransferFormItem extends TransferInput {
  enabled: boolean;
}

// Маппинг формы: ключ = ShippingMethod
export type TransferFormData = Partial<
  Record<ShippingMethod, TransferFormItem>
>;
