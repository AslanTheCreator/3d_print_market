import type { DeliveryCarrier, ListOrdersModel } from "../model/types";

export const deliveryCarrierLabels: Record<DeliveryCarrier, string> = {
  OZON: "Ozon",
  YANDEX: "Яндекс",
  RUSSIAN_POST: "Почта России",
};

export const deliveryAddressMaxLength = 2000;

export function getDeliveryFieldErrors(carrier: string, address: string) {
  return {
    carrier: Object.hasOwn(deliveryCarrierLabels, carrier) ? null : "Выберите службу доставки",
    address: !address.trim()
      ? "Укажите адрес доставки или ПВЗ"
      : address.length > deliveryAddressMaxLength ? "Адрес должен содержать не более 2000 символов" : null,
  };
}

export function getOrderDeliveryAddress(order: Pick<ListOrdersModel, "deliveryCarrier" | "deliveryAddress" | "transfer">) {
  const address = order.deliveryAddress ?? (order.deliveryCarrier == null ? order.transfer?.address : null);
  return address?.trim() || "Не указан";
}
