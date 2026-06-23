import type { DictionaryItem } from "@/entities/dictionary";
import type { SocialNetwork, SocialNetworkType } from "@/shared/types";

export interface SocialFormItem {
  enabled: boolean;
  login: string;
}

export interface SocialFormData {
  items: Record<string, SocialFormItem>;
}

export function trimValue(value: string): string {
  return value.trim();
}

export function buildDefaultValues(
  types: DictionaryItem[],
  existing: SocialNetwork[],
): SocialFormData {
  const byType: Record<string, SocialNetwork> = {};
  for (const item of existing) {
    byType[item.type] = item;
  }

  const items: Record<string, SocialFormItem> = {};
  for (const type of types) {
    const found = byType[type.value];
    items[type.value] = {
      enabled: !!found,
      login: found?.login ?? "",
    };
  }

  return { items };
}

export function buildInitialExpanded(
  types: DictionaryItem[],
  existing: SocialNetwork[],
): Set<string> {
  const existingTypes = new Set(existing.map((item) => item.type));
  const expanded = new Set<string>();

  for (const type of types) {
    if (existingTypes.has(type.value as SocialNetworkType)) {
      expanded.add(type.value);
    }
  }

  return expanded;
}

export function buildExistingByType(
  existing: SocialNetwork[],
): Record<string, SocialNetwork> {
  const map: Record<string, SocialNetwork> = {};
  for (const item of existing) {
    map[item.type] = item;
  }
  return map;
}

export function hasSocialChanges(
  itemsData: Record<string, SocialFormItem> | undefined,
  existingByType: Record<string, SocialNetwork>,
): boolean {
  if (!itemsData) return false;

  for (const [type, formItem] of Object.entries(itemsData)) {
    const prev = existingByType[type];
    const wasEnabled = !!prev;
    const nowEnabled = !!formItem.enabled;

    if (wasEnabled !== nowEnabled) {
      return true;
    }

    if (wasEnabled && nowEnabled) {
      if (trimValue(prev.login) !== trimValue(formItem.login)) {
        return true;
      }
    }
  }

  return false;
}

export function hasSocialBlockingValidationErrors(
  itemsData: Record<string, SocialFormItem> | undefined,
): boolean {
  if (!itemsData) return false;

  return Object.values(itemsData).some((item) => {
    if (!item.enabled) {
      return false;
    }

    return !trimValue(item.login);
  });
}

export function getSocialStatusText({
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
