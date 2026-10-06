"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePrivateScope } from "@/shared/lib/query";
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
  owner: number | undefined;
  isEditMode: boolean;
  formValues: ProductFormData;
  imageUploadState: UseMultipleImageUploadReturn;
  reset: UseFormReset<ProductFormData>;
  isSaved: boolean;
}

export const useProductFormDraftState = ({
  owner,
  isEditMode,
  formValues,
  imageUploadState,
  reset,
  isSaved,
}: UseProductFormDraftStateOptions) => {
  const scope = usePrivateScope();
  const restoreRevision = useRef(0);
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
      [...new Set([...preservedDraftImageIds, ...imageUploadState.imageIds])],
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

    if (owner === undefined || !scope.isCurrent()) return;
    let isActive = true;
    const revision = ++restoreRevision.current;
    const isCurrentRestore = () => isActive && scope.isCurrent() && revision === restoreRevision.current;

    const restoreDraft = async () => {
      const draft = readProductFormDraft(owner);

      if (!draft) {
        if (isCurrentRestore()) {
          setIsDraftReady(true);
        }
        return;
      }

      reset(draft.values);

      if (draft.imageIds.length > 0) {
        setPreservedDraftImageIds(draft.imageIds);
        try {
          const draftImages =
            draft.images.length === draft.imageIds.length
              ? draft.images
              : await loadProductFormDraftImages(draft.imageIds);

          if (draftImages.length !== draft.imageIds.length) throw new Error("Incomplete draft images");
          if (isCurrentRestore()) {
            setPreservedDraftImageIds([]);
            setUploadInitialImages(draftImages);
            setDraftImageError(false);
          }
        } catch {
          if (isCurrentRestore()) {
            setPreservedDraftImageIds(draft.imageIds);
            setDraftImageError(true);
          }
        }
      }

      if (isCurrentRestore()) {
        setIsDraftReady(true);
      }
    };

    void restoreDraft();

    return () => {
      isActive = false;
    };
  }, [isEditMode, reset, setUploadInitialImages, restoreAttempt, owner, scope]);

  useEffect(() => {
    if (isEditMode || isSaved || !isDraftReady || owner === undefined || !scope.isCurrent()) {
      return;
    }

    setDraftStatus(writeProductFormDraft({
      values: formValues,
      imageIds: effectiveImageIds,
      images: currentDraftImages,
    }, owner));
  }, [
    owner,
    scope,
    currentDraftImages,
    effectiveImageIds,
    formValues,
    imageUploadState.imageIds,
    isDraftReady,
    isEditMode,
    isSaved,
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
      restoreRevision.current++;
      setIsDraftReady(true);
      setPreservedDraftImageIds([]);
      setDraftImageError(false);
    },
  };
};
