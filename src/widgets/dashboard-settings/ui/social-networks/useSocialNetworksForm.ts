"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { DictionaryItem } from "@/entities/dictionary";
import {
  useCreateSocial,
  useDeleteSocial,
  useUpdateSocial,
  type SocialNetworkInput,
} from "@/entities/social-network";
import { useNotification } from "@/shared/ui/notification";
import type { SocialNetwork, SocialNetworkType } from "@/shared/types";
import { useInvalidateSellerSettings } from "../../model/useInvalidateSellerSettings";
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
}

export const useSocialNetworksForm = ({
  types,
  existing,
}: UseSocialNetworksFormOptions) => {
  const { showNotification } = useNotification();
  const createMutation = useCreateSocial();
  const updateMutation = useUpdateSocial();
  const deleteMutation = useDeleteSocial();
  const invalidateSellerSettings = useInvalidateSellerSettings();

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const existingByType = useMemo(
    () => buildExistingByType(existing),
    [existing],
  );

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SocialFormData>({
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: buildDefaultValues(types, existing),
  });

  const [expandedItems, setExpandedItems] = useState<Set<string>>(() =>
    buildInitialExpanded(types, existing),
  );
  const [wasSaved, setWasSaved] = useState(false);

  const itemsData = useWatch({
    control,
    name: "items",
  });

  useEffect(() => {
    reset(buildDefaultValues(types, existing));
    setWasSaved(false);
  }, [existing, reset, types]);

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
    () => hasSocialChanges(itemsData, existingByType),
    [existingByType, itemsData],
  );
  const hasBlockingValidationErrors = useMemo(
    () => hasSocialBlockingValidationErrors(itemsData),
    [itemsData],
  );
  const canSubmit = hasChanges && !hasBlockingValidationErrors && !isPending;
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
      const operations: Promise<unknown>[] = [];

      for (const [type, formItem] of Object.entries(data.items)) {
        const prev = existingByType[type];
        const input: SocialNetworkInput = {
          type: type as SocialNetworkType,
          login: trimValue(formItem.login),
        };

        if (formItem.enabled) {
          if (prev) {
            if (trimValue(prev.login) !== input.login) {
              operations.push(updateMutation.mutateAsync({ id: prev.id, input }));
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
        showNotification("Социальные сети сохранены", "success");
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
      existingByType,
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
