import { Currency, ShippingMethod } from "@/shared/types";

// Модель для создания/обновления — отправляем на сервер
export interface TransferInput {
  sending: ShippingMethod;
  price: number;
  currency: Currency;
}
