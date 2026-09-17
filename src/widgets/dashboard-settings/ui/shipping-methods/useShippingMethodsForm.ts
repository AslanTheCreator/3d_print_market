"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useWatch } from "react-hook-form";
import {
  useCreateTransfer,
  useDeleteTransfer,
  useUpdateTransfer,
  type TransferInput,
} from "@/entities/transfer";
import type { DictionaryItem } from "@/entities/dictionary";
import type { ShippingMethod, Transfer } from "@/entities/transfer";
import { useInvalidateSellerSettings } from "../../model/useInvalidateSellerSettings";
import { useSettingsExpansion } from "../../model/useSettingsExpansion";
import { useSettingsDraft, type SettingsOperation } from "../../model/useSettingsDraft";
import {
  DEFAULT_CURRENCY,
  FREE_METHODS,
  REQUIRED_PRICE_METHODS,
  buildCurrencyLabels,
  buildDefaultValues,
  buildExistingByMethod,
  buildInitialExpanded,
  getShippingStatusText,
  hasTransferBlockingValidationErrors,
  hasTransferChanges,
  type TransferFormData,
  type TransferFormItem,
} from "./model";

interface UseShippingMethodsFormOptions {
  methods: DictionaryItem[];
  currencies: DictionaryItem[];
  existing: Transfer[];
  refresh: () => Promise<Transfer[]>;
}

export const useShippingMethodsForm = ({
  methods,
  currencies,
  existing,
  refresh,
}: UseShippingMethodsFormOptions) => {
  const createMutation = useCreateTransfer();
  const updateMutation = useUpdateTransfer();
  const deleteMutation = useDeleteTransfer();
  const invalidateSellerSettings = useInvalidateSellerSettings();

  const buildValues = useCallback((records: Transfer[]) => buildDefaultValues(methods, records), [methods]);
  const draft = useSettingsDraft<Transfer, TransferFormData>({ existing, buildValues, refresh });
  const { control, handleSubmit, setValue, formState: { errors }, baseline, isPending, wasSaved, markUnsaved, runSave, needsRefresh } = draft;
  const existingByMethod = useMemo(() => buildExistingByMethod(baseline), [baseline]);
  const currencyLabels = useMemo(() => buildCurrencyLabels(currencies), [currencies]);
  const { expandedItems, toggleExpanded } = useSettingsExpansion(buildInitialExpanded(methods, existing));

  const draftValuesRef = useRef<
    Record<string, Pick<TransferFormItem, "price" | "currency">>
  >({});
  const itemsData = useWatch({
    control,
    name: "items",
  });

  useEffect(() => {
    if (!itemsData) return;

    for (const [method, item] of Object.entries(itemsData)) {
      draftValuesRef.current[method] = {
        price: item.price ?? 0,
        currency: item.currency ?? DEFAULT_CURRENCY,
      };
    }
  }, [itemsData]);

  const handleEnabledChange = useCallback(
    (
      key: string,
      checked: boolean,
      onChange: (value: boolean) => void,
    ) => {
      const method = key as ShippingMethod;
      const isFree = FREE_METHODS.has(method);
      const shouldClearPrice = REQUIRED_PRICE_METHODS.has(method);

      markUnsaved();
      onChange(checked);

      if (!checked) {
        if (shouldClearPrice) {
          draftValuesRef.current[key] = {
            price: 0,
            currency:
              itemsData?.[key]?.currency ??
              draftValuesRef.current[key]?.currency ??
              DEFAULT_CURRENCY,
          };
          setValue(`items.${key}.price`, 0, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          });
        }
        return;
      }

      const draft = draftValuesRef.current[key];

      setValue(`items.${key}.currency`, draft?.currency ?? DEFAULT_CURRENCY, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });

      if (!isFree) {
        setValue(`items.${key}.price`, draft?.price ?? 0, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
      }
    },
    [itemsData, setValue, markUnsaved],
  );

  const hasChanges = useMemo(
    () => hasTransferChanges(itemsData, existingByMethod),
    [existingByMethod, itemsData],
  );
  const hasBlockingValidationErrors = useMemo(
    () => hasTransferBlockingValidationErrors(itemsData),
    [itemsData],
  );
  const canSubmit = hasChanges && !hasBlockingValidationErrors && !isPending && !needsRefresh;
  const statusText = useMemo(
    () =>
      getShippingStatusText({
        hasBlockingValidationErrors,
        hasChanges,
        isPending,
        wasSaved,
      }),
    [hasBlockingValidationErrors, hasChanges, isPending, wasSaved],
  );

  const onSubmit = useCallback(
    async (data: TransferFormData) => {
      const operations: SettingsOperation[] = [];

      for (const [method, formItem] of Object.entries(data.items)) {
        const previous = existingByMethod[method];
        const isFree = FREE_METHODS.has(method as ShippingMethod);
        const input: TransferInput = {
          sending: method as ShippingMethod,
          price: isFree ? 0 : formItem.price,
          currency: formItem.currency,
        };

        if (formItem.enabled) {
          if (previous) {
            const changed =
              previous.price !== input.price ||
              previous.currency !== input.currency;

            if (changed) {
              operations.push({ key: method, label: methods.find((entry) => entry.value === method)?.description ?? method, run: () => updateMutation.mutateAsync({ id: previous.id, input }) });
            }
          } else {
            operations.push({ key: method, label: methods.find((entry) => entry.value === method)?.description ?? method, run: () => createMutation.mutateAsync(input) });
          }
        } else if (previous) {
          operations.push({ key: method, label: methods.find((entry) => entry.value === method)?.description ?? method, run: () => deleteMutation.mutateAsync(previous.id) });
        }
      }

      await runSave(data, operations);
      await invalidateSellerSettings();
    },
    [
      createMutation,
      deleteMutation,
      existingByMethod,
      invalidateSellerSettings,
      runSave,
      methods,
      updateMutation,
    ],
  );

  return {
    saveError: draft.saveError,
    needsRefresh,
    retryRefresh: draft.retryRefresh,
    existingKeys: new Set(Object.keys(existingByMethod)),
    canSubmit,
    control,
    currencyLabels,
    errors,
    expandedItems,
    handleEnabledChange,
    handleSubmit,
    hasBlockingValidationErrors,
    hasChanges,
    isPending,
    itemsData,
    markUnsaved,
    onSubmit,
    statusText,
    toggleExpanded,
  };
};
