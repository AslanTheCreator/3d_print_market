"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
  useCreateTransfer,
  useDeleteTransfer,
  useUpdateTransfer,
  type TransferInput,
} from "@/entities/transfer";
import type { DictionaryItem } from "@/entities/dictionary";
import { useNotification } from "@/shared/ui/notification";
import type { ShippingMethod, Transfer } from "@/entities/transfer";
import { useInvalidateSellerSettings } from "../../model/useInvalidateSellerSettings";
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
}

export const useShippingMethodsForm = ({
  methods,
  currencies,
  existing,
}: UseShippingMethodsFormOptions) => {
  const { showNotification } = useNotification();
  const createMutation = useCreateTransfer();
  const updateMutation = useUpdateTransfer();
  const deleteMutation = useDeleteTransfer();
  const invalidateSellerSettings = useInvalidateSellerSettings();

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const existingByMethod = useMemo(
    () => buildExistingByMethod(existing),
    [existing],
  );
  const currencyLabels = useMemo(
    () => buildCurrencyLabels(currencies),
    [currencies],
  );

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<TransferFormData>({
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: buildDefaultValues(methods, existing),
  });

  const [expandedItems, setExpandedItems] = useState<Set<string>>(() =>
    buildInitialExpanded(methods, existing),
  );
  const [wasSaved, setWasSaved] = useState(false);

  const draftValuesRef = useRef<
    Record<string, Pick<TransferFormItem, "price" | "currency">>
  >({});
  const itemsData = useWatch({
    control,
    name: "items",
  });

  useEffect(() => {
    reset(buildDefaultValues(methods, existing));
    setWasSaved(false);
  }, [existing, methods, reset]);

  useEffect(() => {
    if (!itemsData) return;

    for (const [method, item] of Object.entries(itemsData)) {
      draftValuesRef.current[method] = {
        price: item.price ?? 0,
        currency: item.currency ?? DEFAULT_CURRENCY,
      };
    }
  }, [itemsData]);

  const toggleExpanded = useCallback((key: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const markUnsaved = useCallback(() => {
    setWasSaved(false);
  }, []);

  const handleEnabledChange = useCallback(
    (
      key: string,
      checked: boolean,
      onChange: (value: boolean) => void,
    ) => {
      const method = key as ShippingMethod;
      const isFree = FREE_METHODS.has(method);
      const shouldClearPrice = REQUIRED_PRICE_METHODS.has(method);

      setWasSaved(false);
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
    [itemsData, setValue],
  );

  const hasChanges = useMemo(
    () => hasTransferChanges(itemsData, existingByMethod),
    [existingByMethod, itemsData],
  );
  const hasBlockingValidationErrors = useMemo(
    () => hasTransferBlockingValidationErrors(itemsData),
    [itemsData],
  );
  const canSubmit = hasChanges && !hasBlockingValidationErrors && !isPending;
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
      const operations: Promise<unknown>[] = [];

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
              operations.push(
                updateMutation.mutateAsync({ id: previous.id, input }),
              );
            }
          } else {
            operations.push(createMutation.mutateAsync(input));
          }
        } else if (previous) {
          operations.push(deleteMutation.mutateAsync(previous.id));
        }
      }

      if (operations.length === 0) {
        showNotification("Нет изменений для сохранения", "info");
        return;
      }

      try {
        await Promise.all(operations);
        await invalidateSellerSettings();
        setExpandedItems(new Set());
        setWasSaved(true);
        showNotification("Способы доставки сохранены", "success");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Не удалось сохранить изменения";
        showNotification(message, "error");
      }
    },
    [
      createMutation,
      deleteMutation,
      existingByMethod,
      invalidateSellerSettings,
      showNotification,
      updateMutation,
    ],
  );

  return {
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
