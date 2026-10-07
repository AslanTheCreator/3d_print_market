"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
  type ProductFormData,
  defaultProductFormValues,
  isEditableAvailability,
  mapProductDetailToFormData,
  useCreateProduct,
  useProductById,
  useUpdateProduct,
  ProductNotFoundError,
} from "@/entities/product";
import { useCategories } from "@/entities/category";
import { useCurrentUser } from "@/entities/user";
import {
  type InitialImageUploadState,
  useMultipleImageUpload,
  useImageCleanup,
} from "@/features/image-upload";
import { useNotification } from "@/shared/ui/notification";
import type { ImageMetadata } from "@/entities/image";
import { getImageUrl, parsePositiveSafeInteger, useGuardedRouter, useUnsavedChanges } from "@/shared/lib";
import { usePrivateScope } from "@/shared/lib/query";
import {
  clearProductFormDraft,
  getProductFormDraftRevision,
  isProductFormDraftEmpty,
  ownsProductFormDraftPreview,
} from "./productFormDraft";
import { PRODUCT_IMAGE_LIMIT } from "./constants";
import {
  buildProductPublishRequirements,
  isReadyForProductPrimaryAction,
} from "./productPublishRequirements";
import { createProductFormSubmitHandler } from "./productFormSubmit";
import { createProductFormSubmission } from "./productFormSubmission";
import {
  normalizeProductFormValues,
  useProductFormDraftState,
} from "./useProductFormDraftState";

const PRODUCT_LIST_PATH = "/dashboard/products";

interface UseProductFormOptions {
  mode?: "create" | "edit";
  productId?: string;
}

const buildInitialImages = (
  imageIds: number[] | undefined,
  productImages: ImageMetadata[] | undefined,
): InitialImageUploadState[] =>
  (imageIds ?? []).map((id) => {
    const image = productImages?.find((metadata) => metadata.id === id);
    return {
      id,
      preview: image ? getImageUrl(image, "medium") ?? "" : "",
    };
  });

export const useProductForm = ({
  mode = "create",
  productId,
}: UseProductFormOptions = {}) => {
  const router = useGuardedRouter();
  const isEditMode = mode === "edit";
  const validProductId = parsePositiveSafeInteger(productId);
  const initializedProductIdRef = useRef<string | null>(null);
  const [initialFormValues, setInitialFormValues] =
    useState<ProductFormData>(defaultProductFormValues);
  const [initialImages, setInitialImages] = useState<InitialImageUploadState[]>(
    [],
  );
  const [isSaved, setIsSaved] = useState(false);
  const savedRef = useRef(false);
  const [submission] = useState(createProductFormSubmission);
  const [isSending, setIsSending] = useState(false);
  const readyForSubmitRef = useRef(false);
  const uploadingRef = useRef(0);
  useEffect(() => {
    submission.activate();
    return () => submission.dispose();
  }, [submission]);
  const imageCleanup = useImageCleanup("PRODUCT");

  const {
    data: categories = [],
    isLoading: isCategoriesLoading,
    error: categoriesError,
    refetch: retryLoadCategories,
  } = useCategories();
  const {
    data: currentUser,
    isLoading: isCurrentUserLoading,
    isFetching: isCurrentUserFetching,
    error: currentUserError,
    refetch: refetchCurrentUser,
  } = useCurrentUser();
  const {
    data: product,
    isLoading: isProductLoading,
    error: productError,
    refetch: retryLoadProduct,
  } = useProductById(isEditMode ? productId : undefined);
  const isProductReadOnly =
    isEditMode &&
    Boolean(product) &&
    !isEditableAvailability(product?.availability);
  const { showNotification } = useNotification();
  const { mutateAsync: createProduct, isPending: isCreating } = useCreateProduct();
  const { mutateAsync: updateProduct, isPending: isUpdating } = useUpdateProduct();
  const imageUploadState = useMultipleImageUpload(
    "PRODUCT",
    PRODUCT_IMAGE_LIMIT,
    isEditMode ? undefined : ownsProductFormDraftPreview,
  );
  const setUploadInitialImages = imageUploadState.setInitialImages;

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProductFormData>({
    defaultValues: defaultProductFormValues,
  });

  const watchedFormValues = useWatch({
    control,
    defaultValue: defaultProductFormValues,
  });
  const formValues = useMemo(
    () => normalizeProductFormValues(watchedFormValues),
    [watchedFormValues],
  );
  const { effectiveImageIds, isDraftReady, resetDraftImageIds, draftStatus, draftImageError, retryDraftImages } =
    useProductFormDraftState({
      owner: currentUser?.id,
      isEditMode,
      formValues,
      imageUploadState,
      reset,
      isSaved,
    });

  useEffect(() => {
    if (isEditMode) {
      return;
    }

    void refetchCurrentUser();
  }, [isEditMode, refetchCurrentUser]);

  useEffect(() => {
    if (!isEditMode || !productId || !product || product.id !== validProductId) {
      return;
    }

    if (initializedProductIdRef.current === productId) {
      return;
    }

    const nextFormValues = mapProductDetailToFormData(product);

    if (!nextFormValues) {
      return;
    }

    const nextImages = buildInitialImages(product.imageIds, product.image);

    initializedProductIdRef.current = productId;
    setInitialFormValues(nextFormValues);
    setInitialImages(nextImages);
    reset(nextFormValues);
    setUploadInitialImages(nextImages);
  }, [isEditMode, product, productId, validProductId, reset, setUploadInitialImages]);

  const isEditTargetReady = !isEditMode || (validProductId !== null && product?.id === validProductId && initializedProductIdRef.current === productId);

  const availability = watch("availability");
  const currentCurrency = watch("currency");
  const categoryIds = watch("categoryIds");
  const name = watch("name");
  const price = watch("price");
  const count = watch("count");
  const hasSellerTransfer =
    isEditMode ||
    currentUser?.transfers.some((transfer) => transfer.status === "ACTIVE") ||
    false;
  const hasSellerAccount = isEditMode || (currentUser?.accounts.length ?? 0) > 0;
  const hasSellerSocialNetwork =
    isEditMode || (currentUser?.socialNetworks.length ?? 0) > 0;

  const publishRequirements = buildProductPublishRequirements({
    effectiveImageIds,
    categoryIds,
    name,
    price,
    count,
    isEditMode,
    hasSellerTransfer,
    hasSellerAccount,
    hasSellerSocialNetwork,
    isSellerSettingsError: !isEditMode && Boolean(currentUserError),
    isSellerSettingsLoading:
      !isEditMode && (isCurrentUserLoading || isCurrentUserFetching),
  });

  const hasImageChanges = useMemo(() => {
    const initialImageIds = initialImages.map((image) => image.id);

    if (initialImageIds.length !== imageUploadState.imageIds.length) {
      return true;
    }

    return initialImageIds.some(
      (imageId, index) => imageId !== imageUploadState.imageIds[index],
    );
  }, [imageUploadState.imageIds, initialImages]);

  const { markSaved } = useUnsavedChanges(
    !isSaved && isEditMode && (isDirty || hasImageChanges),
    imageUploadState.isUploading || (isEditMode && (isUpdating || isSending || imageCleanup.isCleaning)),
  );

  const imageIdsToDelete = useMemo(() => {
    if (!isEditMode) {
      return [];
    }

    const currentImageIds = new Set(imageUploadState.imageIds);

    return initialImages
      .map((image) => image.id)
      .filter((imageId) => !currentImageIds.has(imageId));
  }, [imageUploadState.imageIds, initialImages, isEditMode]);

  const scope = usePrivateScope();
  const resetForm = () => {
    if (!scope.isCurrent() || submission.isBlocked() || uploadingRef.current > 0) return;
    if (isEditMode) {
      reset(initialFormValues);
      imageUploadState.resetImages(initialImages);
      return;
    }

    clearProductFormDraft();
    resetDraftImageIds();
    reset(defaultProductFormValues);
    imageUploadState.resetImages();
  };

  const handleBack = () => {
    router.back();
  };

  const finishSavedProduct = () => {
    if (!submission.isActive() || !scope.isCurrent()) return;
    markSaved();
    showNotification("Товар успешно обновлён", "success");
    router.push(PRODUCT_LIST_PATH);
  };
  const onProductSaved = async (values: ProductFormData, imageIds: number[], ids: number[]) => {
    savedRef.current = true;
    markSaved();
    setIsSaved(true);
    reset(values);
    setInitialFormValues(values);
    setInitialImages(imageIds.map(id => ({ id, preview: imageUploadState.images.find(image => image.id === id)?.preview ?? "" })));
    if (await imageCleanup.cleanup(ids)) finishSavedProduct();
  };
  const onProductCreated = (_values: ProductFormData, draftRevision: number) => {
    savedRef.current = true;
    markSaved();
    setIsSaved(true);
    if (getProductFormDraftRevision() !== draftRevision) return;
    clearProductFormDraft(draftRevision);
    resetDraftImageIds();
    reset(defaultProductFormValues);
    imageUploadState.resetImages();
  };
  const retryImageCleanup = async () => {
    if (await imageCleanup.retry()) finishSavedProduct();
  };

  const hasChanges = isEditMode ? isDirty || hasImageChanges : true;
  const isPending = isCreating || isUpdating || isSending;
  const isFormValid =
    !isSaved &&
    isEditTargetReady &&
    !isProductReadOnly &&
    isDraftReady &&
    !draftImageError &&
    !imageUploadState.isUploading &&
    !imageUploadState.hasError &&
    !isCategoriesLoading &&
    !categoriesError &&
    !productError &&
    hasChanges &&
    isReadyForProductPrimaryAction(publishRequirements);
  readyForSubmitRef.current = isFormValid;

  const onSubmit = createProductFormSubmitHandler({
    createProduct,
    isCurrentScope: scope.isCurrent,
    submission,
    isReadyForSubmit: () => readyForSubmitRef.current && uploadingRef.current === 0,
    onBusyChange: setIsSending,
    effectiveImageIds,
    hasSellerAccount,
    hasSellerSocialNetwork,
    hasSellerTransfer,
    imageIdsToDelete,
    onProductSaved,
    onProductCreated,
    isEditMode,
    isProductReadOnly,
    productId,
    editTargetId: isEditTargetReady ? product?.id : undefined,
    showNotification,
    updateProduct,
    navigateToProductList: () => router.push(PRODUCT_LIST_PATH),
  });

  const isSubmitting = isPending || isSaved || imageUploadState.isUploading;

  return {
    availability,
    categories,
    control,
    currentCurrency,
    hasPrepayment: formValues.prepaymentAmount.trim().length > 0,
    draftStatus,
    draftImageError,
    retryDraftImages,
    isDraftReady,
    hasFormData: imageUploadState.images.length > 0 || !isProductFormDraftEmpty({
      values: formValues, imageIds: effectiveImageIds, images: [],
    }),
    errors,
    handleBack,
    handleFormSubmit: handleSubmit((data) => {
      if (!savedRef.current) return onSubmit(data);
    }),
    isSaved,
    imageCleanup,
    retryImageCleanup,
    imageUploadState: {
      ...imageUploadState,
      addImage: async (file: File) => {
        if (!isDraftReady || draftImageError || submission.isBlocked()) return;
        uploadingRef.current++;
        try { await imageUploadState.addImage(file); }
        finally { uploadingRef.current--; }
      },
      removeImage: (index: number) => {
        if (!isDraftReady || draftImageError || submission.isBlocked() || uploadingRef.current > 0) return;
        imageUploadState.removeImage(index);
      },
    },
    isImageEditingBlocked: isPending || isSaved || !isDraftReady || draftImageError,
    isEditingBlocked: isPending || isSaved,
    hasChanges,
    isCategoriesError: Boolean(categoriesError),
    isCategoriesLoading,
    isEditMode,
    isFormValid,
    isPending,
    isProductReadOnly,
    isEditTargetInvalid: isEditMode && validProductId === null,
    isProductNotFound: isEditMode && productError instanceof ProductNotFoundError,
    isProductError: isEditMode && (Boolean(productError) || (!isProductLoading && (!product || product.id !== validProductId))),
    isProductLoading: isEditMode && (isProductLoading || (!!product && product.id === validProductId && !isProductReadOnly && !isEditTargetReady)),
    isSubmitting,
    publishRequirements,
    resetForm,
    retryLoadCategories,
    retryLoadProduct,
  };
};
