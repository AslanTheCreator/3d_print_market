"use client";

import { useEffect, useMemo, useState } from "react";
import type { UseFormReset } from "react-hook-form";
import type {
  InitialImageUploadState,
  UseMultipleImageUploadReturn,
} from "@/features/image-upload";
import {
  type ProductFormData,
  defaultProductFormValues,
} from "@/entities/product";
import {
  loadProductFormDraftImages,
  readProductFormDraft,
  writeProductFormDraft,
  type ProductFormDraftStatus,
} from "./productFormDraft";

export const normalizeProductFormValues = (
  values: Partial<ProductFormData>,
): ProductFormData => ({
  ...defaultProductFormValues,
  ...values,
  categoryIds: values.categoryIds ?? defaultProductFormValues.categoryIds,
  currency: values.currency ?? defaultProductFormValues.currency,
  availability:
    values.availability ?? defaultProductFormValues.availability,
});

interface UseProductFormDraftStateOptions {
  isEditMode: boolean;
  formValues: ProductFormData;
  imageUploadState: UseMultipleImageUploadReturn;
  reset: UseFormReset<ProductFormData>;
}

export const useProductFormDraftState = ({
  isEditMode,
  formValues,
  imageUploadState,
  reset,
}: UseProductFormDraftStateOptions) => {
  const [draftStatus, setDraftStatus] = useState<ProductFormDraftStatus>("empty");
  const [draftImageError, setDraftImageError] = useState(false);
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const [preservedDraftImageIds, setPreservedDraftImageIds] = useState<
    number[]
  >([]);
  const [isDraftReady, setIsDraftReady] = useState(isEditMode);
  const setUploadInitialImages = imageUploadState.setInitialImages;

  const effectiveImageIds = useMemo(
    () =>
      imageUploadState.imageIds.length > 0
        ? imageUploadState.imageIds
        : preservedDraftImageIds,
    [imageUploadState.imageIds, preservedDraftImageIds],
  );

  const currentDraftImages = useMemo<InitialImageUploadState[]>(
    () =>
      imageUploadState.images
        .map((image) => ({
          id: image.id ?? 0,
          preview: image.preview,
        }))
        .filter(
          (image): image is InitialImageUploadState =>
            image.id > 0 && Boolean(image.preview),
        ),
    [imageUploadState.images],
  );

  useEffect(() => {
    if (isEditMode) {
      setIsDraftReady(true);
      return;
    }

    let isActive = true;

    const restoreDraft = async () => {
      const draft = readProductFormDraft();

      if (!draft) {
        if (isActive) {
          setIsDraftReady(true);
        }
        return;
      }

      reset(draft.values);

      if (draft.imageIds.length > 0) {
        try {
          const draftImages =
            draft.images.length === draft.imageIds.length
              ? draft.images
              : await loadProductFormDraftImages(draft.imageIds);

          if (draftImages.length !== draft.imageIds.length) throw new Error("Incomplete draft images");
          if (isActive) {
            setPreservedDraftImageIds([]);
            setUploadInitialImages(draftImages);
            setDraftImageError(false);
          }
        } catch {
          if (isActive) {
            setPreservedDraftImageIds(draft.imageIds);
            setDraftImageError(true);
          }
        }
      }

      if (isActive) {
        setIsDraftReady(true);
      }
    };

    void restoreDraft();

    return () => {
      isActive = false;
    };
  }, [isEditMode, reset, setUploadInitialImages, restoreAttempt]);

  useEffect(() => {
    if (isEditMode || !isDraftReady) {
      return;
    }

    if (imageUploadState.imageIds.length > 0 && preservedDraftImageIds.length > 0) {
      setPreservedDraftImageIds([]);
      setDraftImageError(false);
    }

    setDraftStatus(writeProductFormDraft({
      values: formValues,
      imageIds: effectiveImageIds,
      images: currentDraftImages,
    }));
  }, [
    currentDraftImages,
    effectiveImageIds,
    formValues,
    imageUploadState.imageIds,
    isDraftReady,
    isEditMode,
    preservedDraftImageIds.length,
  ]);

  return {
    effectiveImageIds,
    draftStatus,
    draftImageError,
    isDraftReady,
    retryDraftImages: () => {
      setIsDraftReady(false);
      setRestoreAttempt((previous) => previous + 1);
    },
    resetDraftImageIds: () => {
      setPreservedDraftImageIds([]);
      setDraftImageError(false);
    },
  };
};
