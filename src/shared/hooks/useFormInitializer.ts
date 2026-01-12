import { useEffect, useRef } from "react";
import { UseFormSetValue } from "react-hook-form";

interface UseFormInitializerOptions<T, TDict> {
  dictionaryItems: TDict[] | undefined;
  existingItems: T[];
  isLoading: boolean;
  setValue: UseFormSetValue<any>;
  getDictionaryKey: (item: TDict) => string;
  getExistingKey: (item: T) => string;
  mapExistingToFormData: (item: T) => any;
  getDefaultFormData: () => any;
  onInitialized?: (expandedKeys: Set<string>) => void;
}

export function useFormInitializer<T, TDict>({
  dictionaryItems,
  existingItems,
  isLoading,
  setValue,
  getDictionaryKey,
  getExistingKey,
  mapExistingToFormData,
  getDefaultFormData,
  onInitialized,
}: UseFormInitializerOptions<T, TDict>) {
  const isInitialized = useRef(false);

  useEffect(() => {
    if (
      dictionaryItems &&
      dictionaryItems.length > 0 &&
      !isLoading &&
      !isInitialized.current
    ) {
      const formData: Record<string, any> = {};
      const expanded = new Set<string>();

      dictionaryItems.forEach((dictItem) => {
        const key = getDictionaryKey(dictItem);
        const existingItem = existingItems.find(
          (item) => getExistingKey(item) === key
        );

        if (existingItem) {
          formData[key] = {
            enabled: true,
            ...mapExistingToFormData(existingItem),
          };
          expanded.add(key);
        } else {
          formData[key] = {
            enabled: false,
            ...getDefaultFormData(),
          };
        }
      });

      setValue("items", formData, { shouldDirty: false });
      onInitialized?.(expanded);
      isInitialized.current = true;
    }
  }, [
    dictionaryItems,
    existingItems,
    isLoading,
    setValue,
    getDictionaryKey,
    getExistingKey,
    mapExistingToFormData,
    getDefaultFormData,
    onInitialized,
  ]);

  return { isInitialized: isInitialized.current };
}
