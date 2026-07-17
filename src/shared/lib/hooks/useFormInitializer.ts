import { useEffect, useRef } from "react";
import type { SetValueConfig } from "react-hook-form";

type FormInitializerItem<TFormFields extends object> = TFormFields & {
  enabled: boolean;
};

type FormInitializerItems<TFormFields extends object> = Record<
  string,
  FormInitializerItem<TFormFields>
>;

type FormInitializerSetValue<TFormFields extends object> = (
  name: "items",
  value: FormInitializerItems<TFormFields>,
  options?: SetValueConfig
) => void;

interface UseFormInitializerOptions<T, TDict, TFormFields extends object> {
  dictionaryItems: TDict[] | undefined;
  existingItems: T[];
  isLoading: boolean;
  setValue: FormInitializerSetValue<TFormFields>;
  getDictionaryKey: (item: TDict) => string;
  getExistingKey: (item: T) => string;
  mapExistingToFormData: (item: T) => TFormFields;
  getDefaultFormData: () => TFormFields;
  onInitialized?: (expandedKeys: Set<string>) => void;
}

export function useFormInitializer<T, TDict, TFormFields extends object>({
  dictionaryItems,
  existingItems,
  isLoading,
  setValue,
  getDictionaryKey,
  getExistingKey,
  mapExistingToFormData,
  getDefaultFormData,
  onInitialized,
}: UseFormInitializerOptions<T, TDict, TFormFields>) {
  const isInitialized = useRef(false);

  useEffect(() => {
    if (
      dictionaryItems &&
      dictionaryItems.length > 0 &&
      !isLoading &&
      !isInitialized.current
    ) {
      const formData: FormInitializerItems<TFormFields> = {};
      const expanded = new Set<string>();

      dictionaryItems.forEach((dictItem) => {
        const key = getDictionaryKey(dictItem);
        const existingItem = existingItems.find(
          (item) => getExistingKey(item) === key
        );

        if (existingItem) {
          formData[key] = {
            ...mapExistingToFormData(existingItem),
            enabled: true,
          };
          expanded.add(key);
        } else {
          formData[key] = {
            ...getDefaultFormData(),
            enabled: false,
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
