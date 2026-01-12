import { useState, useCallback, useMemo } from "react";

interface UseBatchFormOptions<T, TCreate> {
  existingItems: T[];
  getItemKey: (item: T) => string;
  mapToCreateModel: (data: any, key: string) => TCreate;
  getItemId: (item: T) => number;
}

export function useBatchForm<T, TCreate>({
  existingItems,
  getItemKey,
  mapToCreateModel,
  getItemId,
}: UseBatchFormOptions<T, TCreate>) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Переключение раскрытия элемента
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

  // Проверка раскрытия
  const isExpanded = useCallback(
    (key: string) => expandedItems.has(key),
    [expandedItems]
  );

  // Вычисление изменений для batch save
  const computeChanges = useCallback(
    (formData: Record<string, any>) => {
      const toCreate: TCreate[] = [];
      const toDelete: number[] = [];

      Object.entries(formData).forEach(([key, value]) => {
        const wasEnabled = existingItems.some(
          (item) => getItemKey(item) === key
        );
        const nowEnabled = !!value?.enabled;

        // Создаём новые
        if (nowEnabled && !wasEnabled) {
          toCreate.push(mapToCreateModel(value, key));
        }

        // Удаляем старые
        if (!nowEnabled && wasEnabled) {
          const item = existingItems.find((item) => getItemKey(item) === key);
          if (item) {
            toDelete.push(getItemId(item));
          }
        }
      });

      return { toCreate, toDelete };
    },
    [existingItems, getItemKey, mapToCreateModel, getItemId]
  );

  // Начальные раскрытые элементы
  const initialExpandedKeys = useMemo(() => {
    return new Set(existingItems.map(getItemKey));
  }, [existingItems, getItemKey]);

  return {
    expandedItems,
    toggleExpanded,
    isExpanded,
    computeChanges,
    initialExpandedKeys,
  };
}
