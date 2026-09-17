"use client";

import { useCallback, useMemo } from "react";
import { useWatch } from "react-hook-form";
import type { DictionaryItem } from "@/entities/dictionary";
import {
  useCreateSocial,
  useDeleteSocial,
  useUpdateSocial,
  type SocialNetworkInput,
} from "@/entities/social-network";
import type { SocialNetwork, SocialNetworkType } from "@/entities/social-network";
import { useInvalidateSellerSettings } from "../../model/useInvalidateSellerSettings";
import { useSettingsExpansion } from "../../model/useSettingsExpansion";
import { useSettingsDraft, type SettingsOperation } from "../../model/useSettingsDraft";
import {
  buildDefaultValues,
  buildExistingByType,
  buildInitialExpanded,
  getSocialStatusText,
  hasSocialBlockingValidationErrors,
  hasSocialChanges,
  trimValue,
  type SocialFormData,
} from "./model";

interface UseSocialNetworksFormOptions {
  types: DictionaryItem[];
  existing: SocialNetwork[];
  refresh: () => Promise<SocialNetwork[]>;
}

export const useSocialNetworksForm = ({
  types,
  existing,
  refresh,
}: UseSocialNetworksFormOptions) => {
  const createMutation = useCreateSocial();
  const updateMutation = useUpdateSocial();
  const deleteMutation = useDeleteSocial();
  const invalidateSellerSettings = useInvalidateSellerSettings();

  const buildValues = useCallback((records: SocialNetwork[]) => buildDefaultValues(types, records), [types]);
  const draft = useSettingsDraft<SocialNetwork, SocialFormData>({ existing, buildValues, refresh });
  const { control, handleSubmit, formState: { errors }, baseline, isPending, wasSaved, markUnsaved, runSave, needsRefresh } = draft;
  const existingByType = useMemo(() => buildExistingByType(baseline), [baseline]);
  const { expandedItems, toggleExpanded } = useSettingsExpansion(buildInitialExpanded(types, existing));

  const itemsData = useWatch({
    control,
    name: "items",
  });

  const hasChanges = useMemo(
    () => hasSocialChanges(itemsData, existingByType),
    [existingByType, itemsData],
  );
  const hasBlockingValidationErrors = useMemo(
    () => hasSocialBlockingValidationErrors(itemsData),
    [itemsData],
  );
  const canSubmit = hasChanges && !hasBlockingValidationErrors && !isPending && !needsRefresh;
  const statusText = useMemo(
    () =>
      getSocialStatusText({
        hasBlockingValidationErrors,
        hasChanges,
        isPending,
        wasSaved,
      }),
    [hasBlockingValidationErrors, hasChanges, isPending, wasSaved],
  );

  const onSubmit = useCallback(
    async (data: SocialFormData) => {
      const operations: SettingsOperation[] = [];

      for (const [type, formItem] of Object.entries(data.items)) {
        const prev = existingByType[type];
        const input: SocialNetworkInput = {
          type: type as SocialNetworkType,
          login: trimValue(formItem.login),
        };

        if (formItem.enabled) {
          if (prev) {
            if (trimValue(prev.login) !== input.login) {
              operations.push({ key: type, label: types.find((entry) => entry.value === type)?.description ?? type, run: () => updateMutation.mutateAsync({ id: prev.id, input }) });
            }
          } else {
            operations.push({ key: type, label: types.find((entry) => entry.value === type)?.description ?? type, run: () => createMutation.mutateAsync(input) });
          }
        } else if (prev) {
          operations.push({ key: type, label: types.find((entry) => entry.value === type)?.description ?? type, run: () => deleteMutation.mutateAsync(prev.id) });
        }
      }

      await runSave(data, operations);
      await invalidateSellerSettings();
    },
    [
      createMutation,
      deleteMutation,
      existingByType,
      invalidateSellerSettings,
      runSave,
      types,
      updateMutation,
    ],
  );

  return {
    saveError: draft.saveError,
    needsRefresh,
    retryRefresh: draft.retryRefresh,
    existingKeys: new Set(Object.keys(existingByType)),
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
