"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
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
import { getImageUrl, parsePositiveSafeInteger } from "@/shared/lib";
import { usePrivateScope } from "@/shared/lib/query";
import {
  clearProductFormDraft,
  isProductFormDraftEmpty,
  ownsProductFormDraftPreview,
} from "./productFormDraft";
import { PRODUCT_IMAGE_LIMIT } from "./constants";
import {
  buildProductPublishRequirements,
  isReadyForProductPrimaryAction,
} from "./productPublishRequirements";
import { createProductFormSubmitHandler } from "./productFormSubmit";
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
  const router = useRouter();
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
  const { mutate: createProduct, isPending: isCreating } = useCreateProduct();
  const { mutate: updateProduct, isPending: isUpdating } = useUpdateProduct();
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
    });

  useEffect(() => {
    if (isEditMode) {
      return;
    }

    void refetchCurrentUser();
  }, [isEditMode, refetchCurrentUser]);

  useEffect(() => {
    if (!imageUploadState.isUploading) {
      return;
    }

    const preventNavigationWhileUploading = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const link = target.closest("a[href]");

      if (!link) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener("click", preventNavigationWhileUploading, true);

    return () => {
      document.removeEventListener(
        "click",
        preventNavigationWhileUploading,
        true,
      );
    };
  }, [imageUploadState.isUploading]);

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
    if (!scope.isCurrent() || savedRef.current) return;
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
    if (!scope.isCurrent()) return;
    showNotification("Товар успешно обновлён", "success");
    router.push(PRODUCT_LIST_PATH);
  };
  const onProductSaved = async (ids: number[]) => {
    savedRef.current = true;
    setIsSaved(true);
    if (await imageCleanup.cleanup(ids)) finishSavedProduct();
  };
  const retryImageCleanup = async () => {
    if (await imageCleanup.retry()) finishSavedProduct();
  };

  const onSubmit = createProductFormSubmitHandler({
    createProduct,
    isCurrentScope: scope.isCurrent,
    effectiveImageIds,
    hasSellerAccount,
    hasSellerSocialNetwork,
    hasSellerTransfer,
    imageIdsToDelete,
    onProductSaved,
    isEditMode,
    isProductReadOnly,
    productId,
    editTargetId: isEditTargetReady ? product?.id : undefined,
    resetForm,
    showNotification,
    updateProduct,
    navigateToProductList: () => router.push(PRODUCT_LIST_PATH),
  });

  const hasChanges = isEditMode ? isDirty || hasImageChanges : true;
  const isPending = isCreating || isUpdating;
  const isFormValid =
    !isSaved &&
    isEditTargetReady &&
    !isProductReadOnly &&
    isDraftReady &&
    !draftImageError &&
    !imageUploadState.isUploading &&
    hasChanges &&
    isReadyForProductPrimaryAction(publishRequirements);
  const isSubmitting = isPending || imageUploadState.isUploading;

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
      if (!savedRef.current) onSubmit(data);
    }),
    isSaved,
    imageCleanup,
    retryImageCleanup,
    imageUploadState: {
      ...imageUploadState,
      addImage: async (file: File) => {
        if (!isDraftReady || draftImageError || savedRef.current) return;
        await imageUploadState.addImage(file);
      },
      removeImage: (index: number) => {
        if (!isDraftReady || draftImageError || savedRef.current) return;
        imageUploadState.removeImage(index);
      },
    },
    isImageEditingBlocked: isSaved || !isDraftReady || draftImageError,
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
