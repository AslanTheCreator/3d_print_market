import type { DictionaryItem } from "@/entities/dictionary";
import type { Currency } from "@/shared/types";
import type { ShippingMethod, Transfer } from "@/entities/transfer";

export interface TransferFormItem {
  enabled: boolean;
  price: number;
  currency: Currency;
}

export interface TransferFormData {
  items: Record<string, TransferFormItem>;
}

export const FREE_METHODS = new Set<ShippingMethod>(["PRODUCT_PICKUP"]);
export const REQUIRED_PRICE_METHODS = new Set<ShippingMethod>([
  "TRANSPORT_COMPANY",
  "RUSSIAN_POST",
]);
export const DEFAULT_CURRENCY: Currency = "RUB";

export function buildDefaultValues(
  methods: DictionaryItem[],
  existing: Transfer[],
): TransferFormData {
  const byMethod: Record<string, Transfer> = {};
  for (const transfer of existing) {
    byMethod[transfer.sending] = transfer;
  }

  const items: Record<string, TransferFormItem> = {};
  for (const method of methods) {
    const found = byMethod[method.value];
    items[method.value] = {
      enabled: !!found,
      price: found?.price ?? 0,
      currency: found?.currency ?? DEFAULT_CURRENCY,
    };
  }

  return { items };
}

export function buildInitialExpanded(
  methods: DictionaryItem[],
  existing: Transfer[],
): Set<string> {
  const existingMethods = new Set(existing.map((transfer) => transfer.sending));
  const expanded = new Set<string>();

  for (const method of methods) {
    if (existingMethods.has(method.value as ShippingMethod)) {
      expanded.add(method.value);
    }
  }

  return expanded;
}

export function buildExistingByMethod(
  existing: Transfer[],
): Record<string, Transfer> {
  const map: Record<string, Transfer> = {};
  for (const transfer of existing) {
    map[transfer.sending] = transfer;
  }
  return map;
}

export function buildCurrencyLabels(
  currencies: DictionaryItem[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const currency of currencies) {
    map[currency.value] = currency.description;
  }
  return map;
}

export function hasTransferChanges(
  itemsData: Record<string, TransferFormItem> | undefined,
  existingByMethod: Record<string, Transfer>,
): boolean {
  if (!itemsData) return false;

  for (const [method, formItem] of Object.entries(itemsData)) {
    const previous = existingByMethod[method];
    const wasEnabled = !!previous;
    const nowEnabled = !!formItem.enabled;

    if (wasEnabled !== nowEnabled) {
      return true;
    }

    if (wasEnabled && nowEnabled) {
      const isFree = FREE_METHODS.has(method as ShippingMethod);
      if (!isFree && previous.price !== formItem.price) {
        return true;
      }
      if (previous.currency !== formItem.currency) {
        return true;
      }
    }
  }

  return false;
}

export function hasTransferBlockingValidationErrors(
  itemsData: Record<string, TransferFormItem> | undefined,
): boolean {
  if (!itemsData) return false;

  return Object.entries(itemsData).some(([method, formItem]) => {
    if (!formItem.enabled) {
      return false;
    }

    const shippingMethod = method as ShippingMethod;
    const requiresPrice = REQUIRED_PRICE_METHODS.has(shippingMethod);

    if (!formItem.currency) {
      return true;
    }

    if (requiresPrice && formItem.price <= 0) {
      return true;
    }

    return false;
  });
}

export function getShippingStatusText({
  hasBlockingValidationErrors,
  hasChanges,
  isPending,
  wasSaved,
}: {
  hasBlockingValidationErrors: boolean;
  hasChanges: boolean;
  isPending: boolean;
  wasSaved: boolean;
}): string {
  if (isPending) {
    return "Сохраняем изменения...";
  }

  if (hasBlockingValidationErrors) {
    return "Заполните обязательные поля, чтобы сохранить изменения.";
  }

  if (hasChanges) {
    return "Есть несохраненные изменения.";
  }

  if (wasSaved) {
    return "Изменения сохранены.";
  }

  return "Изменений нет.";
}
