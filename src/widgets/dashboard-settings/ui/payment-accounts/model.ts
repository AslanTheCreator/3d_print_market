import type { DictionaryItem } from "@/entities/dictionary";
import type { AccountsBaseModel, TransferMoney } from "@/shared/types";

export interface AccountFormItem {
  enabled: boolean;
  username: string;
  entityValue: string;
  comment: string;
}

export interface AccountFormData {
  items: Record<string, AccountFormItem>;
}

export function trimValue(value: string): string {
  return value.trim();
}

export function buildDefaultValues(
  methods: DictionaryItem[],
  existing: AccountsBaseModel[],
): AccountFormData {
  const byMethod: Record<string, AccountsBaseModel> = {};
  for (const account of existing) {
    byMethod[account.transferMoney] = account;
  }

  const items: Record<string, AccountFormItem> = {};
  for (const method of methods) {
    const found = byMethod[method.value];
    items[method.value] = {
      enabled: !!found,
      username: found?.username ?? "",
      entityValue: found?.entityValue ?? "",
      comment: found?.comment ?? "",
    };
  }

  return { items };
}

export function buildInitialExpanded(
  methods: DictionaryItem[],
  existing: AccountsBaseModel[],
): Set<string> {
  const existingMethods = new Set(existing.map((account) => account.transferMoney));
  const expanded = new Set<string>();

  for (const method of methods) {
    if (existingMethods.has(method.value as TransferMoney)) {
      expanded.add(method.value);
    }
  }

  return expanded;
}

export function buildExistingByMethod(
  existing: AccountsBaseModel[],
): Record<string, AccountsBaseModel> {
  const map: Record<string, AccountsBaseModel> = {};
  for (const account of existing) {
    map[account.transferMoney] = account;
  }
  return map;
}

export function hasAccountChanges(
  itemsData: Record<string, AccountFormItem> | undefined,
  existingByMethod: Record<string, AccountsBaseModel>,
): boolean {
  if (!itemsData) return false;

  for (const [method, formItem] of Object.entries(itemsData)) {
    const prev = existingByMethod[method];
    const wasEnabled = !!prev;
    const nowEnabled = !!formItem.enabled;

    if (wasEnabled !== nowEnabled) return true;

    if (wasEnabled && nowEnabled) {
      if (trimValue(prev.username) !== trimValue(formItem.username)) return true;
      if (trimValue(prev.entityValue) !== trimValue(formItem.entityValue)) return true;
      if (trimValue(prev.comment ?? "") !== trimValue(formItem.comment ?? "")) return true;
    }
  }

  return false;
}

export function hasAccountBlockingValidationErrors(
  itemsData: Record<string, AccountFormItem> | undefined,
): boolean {
  if (!itemsData) return false;

  return Object.values(itemsData).some((item) => {
    if (!item.enabled) {
      return false;
    }

    return !trimValue(item.username) || !trimValue(item.entityValue);
  });
}

export function getPaymentStatusText({
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
