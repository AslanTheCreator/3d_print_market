import { useState, useCallback } from "react";

type BatchFormItem = {
  enabled?: boolean;
};

interface UseBatchFormOptions<T, TCreate, TFormItem extends BatchFormItem> {
  existingItems: T[];
  getItemKey: (item: T) => string;
  mapToCreateModel: (data: TFormItem, key: string) => TCreate;
  getItemId: (item: T) => number;
  compareItemData?: (existing: T, formData: TFormItem) => boolean;
}

export function useBatchForm<
  T,
  TCreate,
  TFormItem extends BatchFormItem = BatchFormItem,
>({
  existingItems,
  getItemKey,
  mapToCreateModel,
  getItemId,
  compareItemData,
}: UseBatchFormOptions<T, TCreate, TFormItem>) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = useCallback((key: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  }, []);

  const isExpanded = useCallback(
    (key: string) => expandedItems.has(key),
    [expandedItems]
  );

  const computeChanges = useCallback(
    (formData: Record<string, TFormItem>) => {
      const toCreate: TCreate[] = [];
      const toDelete: number[] = [];
      const toUpdate: Array<{ id: number; data: TCreate }> = [];

      Object.entries(formData).forEach(([key, value]) => {
        const existingItem = existingItems.find(
          (item) => getItemKey(item) === key
        );
        const wasEnabled = !!existingItem;
        const nowEnabled = !!value.enabled;

        // Создаём новые записи
        if (nowEnabled && !wasEnabled) {
          toCreate.push(mapToCreateModel(value, key));
        }

        // Удаляем отключенные
        if (!nowEnabled && wasEnabled) {
          toDelete.push(getItemId(existingItem));
        }

        // Проверяем изменения в существующих записях
        if (nowEnabled && wasEnabled && compareItemData) {
          const hasChanges = !compareItemData(existingItem, value);
          if (hasChanges) {
            toUpdate.push({
              id: getItemId(existingItem),
              data: mapToCreateModel(value, key),
            });
          }
        }
      });

      return { toCreate, toDelete, toUpdate };
    },
    [existingItems, getItemKey, mapToCreateModel, getItemId, compareItemData]
  );

  return {
    expandedItems,
    toggleExpanded,
    isExpanded,
    computeChanges,
  };
}
