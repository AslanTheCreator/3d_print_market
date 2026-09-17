"use client";

import { useCallback, useMemo } from "react";
import { useWatch } from "react-hook-form";
import type { DictionaryItem } from "@/entities/dictionary";
import {
  useCreateAccount,
  useDeleteAccount,
  useUpdateAccount,
} from "@/entities/account";
import type { AccountsBaseModel, TransferMoney } from "@/entities/account";
import { useInvalidateSellerSettings } from "../../model/useInvalidateSellerSettings";
import { useSettingsExpansion } from "../../model/useSettingsExpansion";
import { useSettingsDraft, type SettingsOperation } from "../../model/useSettingsDraft";
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
  refresh: () => Promise<AccountsBaseModel[]>;
}

export const usePaymentAccountsForm = ({
  methods,
  existing,
  refresh,
}: UsePaymentAccountsFormOptions) => {
  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();
  const deleteMutation = useDeleteAccount();
  const invalidateSellerSettings = useInvalidateSellerSettings();

  const buildValues = useCallback((records: AccountsBaseModel[]) => buildDefaultValues(methods, records), [methods]);
  const draft = useSettingsDraft<AccountsBaseModel, AccountFormData>({ existing, buildValues, refresh });
  const { control, handleSubmit, formState: { errors }, baseline, isPending, wasSaved, markUnsaved, runSave, needsRefresh } = draft;
  const existingByMethod = useMemo(() => buildExistingByMethod(baseline), [baseline]);
  const { expandedItems, toggleExpanded } = useSettingsExpansion(buildInitialExpanded(methods, existing));

  const itemsData = useWatch({
    control,
    name: "items",
  });

  const hasChanges = useMemo(
    () => hasAccountChanges(itemsData, existingByMethod),
    [existingByMethod, itemsData],
  );
  const hasBlockingValidationErrors = useMemo(
    () => hasAccountBlockingValidationErrors(itemsData),
    [itemsData],
  );
  const canSubmit = hasChanges && !hasBlockingValidationErrors && !isPending && !needsRefresh;
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
      const operations: SettingsOperation[] = [];

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
              operations.push({ key: method, label: methods.find((entry) => entry.value === method)?.description ?? method, run: () => updateMutation.mutateAsync({
                  id: prev.id,
                  input,
                }) });
            }
          } else {
            operations.push({ key: method, label: methods.find((entry) => entry.value === method)?.description ?? method, run: () => createMutation.mutateAsync(input) });
          }
        } else if (prev) {
          operations.push({ key: method, label: methods.find((entry) => entry.value === method)?.description ?? method, run: () => deleteMutation.mutateAsync(prev.id) });
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
