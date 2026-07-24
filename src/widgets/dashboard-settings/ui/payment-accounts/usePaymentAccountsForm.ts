"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { DictionaryItem } from "@/entities/dictionary";
import {
  useCreateAccount,
  useDeleteAccount,
  useUpdateAccount,
} from "@/entities/account";
import { useNotification } from "@/shared/ui/notification";
import type { AccountsBaseModel, TransferMoney } from "@/entities/account";
import { useInvalidateSellerSettings } from "../../model/useInvalidateSellerSettings";
import {
  buildDefaultValues,
  buildExistingByMethod,
  buildInitialExpanded,
  getPaymentStatusText,
  hasAccountBlockingValidationErrors,
  hasAccountChanges,
  trimValue,
  type AccountFormData,
} from "./model";

interface UsePaymentAccountsFormOptions {
  methods: DictionaryItem[];
  existing: AccountsBaseModel[];
}

export const usePaymentAccountsForm = ({
  methods,
  existing,
}: UsePaymentAccountsFormOptions) => {
  const { showNotification } = useNotification();
  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();
  const deleteMutation = useDeleteAccount();
  const invalidateSellerSettings = useInvalidateSellerSettings();

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const existingByMethod = useMemo(
    () => buildExistingByMethod(existing),
    [existing],
  );

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AccountFormData>({
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: buildDefaultValues(methods, existing),
  });

  const [expandedItems, setExpandedItems] = useState<Set<string>>(() =>
    buildInitialExpanded(methods, existing),
  );
  const [wasSaved, setWasSaved] = useState(false);

  const itemsData = useWatch({
    control,
    name: "items",
  });

  useEffect(() => {
    reset(buildDefaultValues(methods, existing));
    setWasSaved(false);
  }, [existing, methods, reset]);

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

  const hasChanges = useMemo(
    () => hasAccountChanges(itemsData, existingByMethod),
    [existingByMethod, itemsData],
  );
  const hasBlockingValidationErrors = useMemo(
    () => hasAccountBlockingValidationErrors(itemsData),
    [itemsData],
  );
  const canSubmit = hasChanges && !hasBlockingValidationErrors && !isPending;
  const statusText = useMemo(
    () =>
      getPaymentStatusText({
        hasBlockingValidationErrors,
        hasChanges,
        isPending,
        wasSaved,
      }),
    [hasBlockingValidationErrors, hasChanges, isPending, wasSaved],
  );

  const onSubmit = useCallback(
    async (data: AccountFormData) => {
      const operations: Promise<unknown>[] = [];

      for (const [method, formItem] of Object.entries(data.items)) {
        const prev = existingByMethod[method];
        const input = {
          transferMoney: method as TransferMoney,
          username: trimValue(formItem.username),
          entityValue: trimValue(formItem.entityValue),
          comment: trimValue(formItem.comment),
        };

        if (formItem.enabled) {
          if (prev) {
            const changed =
              trimValue(prev.username) !== input.username ||
              trimValue(prev.entityValue) !== input.entityValue ||
              trimValue(prev.comment ?? "") !== input.comment;

            if (changed) {
              operations.push(
                updateMutation.mutateAsync({
                  id: prev.id,
                  input,
                }),
              );
            }
          } else {
            operations.push(createMutation.mutateAsync(input));
          }
        } else if (prev) {
          operations.push(deleteMutation.mutateAsync(prev.id));
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
        showNotification("Способы оплаты сохранены", "success");
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
    errors,
    expandedItems,
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
