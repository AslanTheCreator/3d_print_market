"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import {
  type ProductFormData,
  defaultProductFormValues,
  mapProductDetailToFormData,
  useCreateProduct,
  useProductById,
  useUpdateProduct,
} from "@/entities/product";
import { useCategories } from "@/entities/category";
import { useCurrentUser } from "@/entities/user";
import {
  type InitialImageUploadState,
  useMultipleImageUpload,
} from "@/features/image-upload";
import { useNotification } from "@/shared/ui/notification";
import type { ImageMetadata } from "@/shared/types";
import { getImageUrl } from "@/shared/lib";
import { clearProductFormDraft } from "./productFormDraft";
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
  (productImages ?? [])
    .map((image, index) => {
      const preview = getImageUrl(image, "medium");

      if (!preview) {
        return null;
      }

      return {
        id: imageIds?.[index] ?? index,
        preview,
      };
    })
    .filter((image): image is InitialImageUploadState => image !== null);

export const useProductForm = ({
  mode = "create",
  productId,
}: UseProductFormOptions = {}) => {
  const router = useRouter();
  const isEditMode = mode === "edit";
  const initializedProductIdRef = useRef<string | null>(null);
  const [initialFormValues, setInitialFormValues] =
    useState<ProductFormData>(defaultProductFormValues);
  const [initialImages, setInitialImages] = useState<InitialImageUploadState[]>(
    [],
  );

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
  const { showNotification } = useNotification();
  const { mutate: createProduct, isPending: isCreating } = useCreateProduct();
  const { mutate: updateProduct, isPending: isUpdating } = useUpdateProduct();
  const imageUploadState = useMultipleImageUpload(
    "PRODUCT",
    PRODUCT_IMAGE_LIMIT,
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
  const { effectiveImageIds, isDraftReady, resetDraftImageIds } =
    useProductFormDraftState({
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
    if (!isEditMode || !productId || !product) {
      return;
    }

    if (initializedProductIdRef.current === productId) {
      return;
    }

    const nextFormValues = mapProductDetailToFormData(product);
    const nextImages = buildInitialImages(product.imageIds, product.image);

    initializedProductIdRef.current = productId;
    setInitialFormValues(nextFormValues);
    setInitialImages(nextImages);
    reset(nextFormValues);
    setUploadInitialImages(nextImages);
  }, [isEditMode, product, productId, reset, setUploadInitialImages]);

  const isPreorder = watch("isPreorder");
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

  const resetForm = () => {
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

  const onSubmit = createProductFormSubmitHandler({
    createProduct,
    effectiveImageIds,
    hasSellerAccount,
    hasSellerSocialNetwork,
    hasSellerTransfer,
    isEditMode,
    productId,
    resetForm,
    showNotification,
    updateProduct,
    navigateToProductList: () => router.push(PRODUCT_LIST_PATH),
  });

  const hasChanges = isEditMode ? isDirty || hasImageChanges : true;
  const isPending = isCreating || isUpdating;
  const isFormValid =
    isDraftReady &&
    !imageUploadState.isUploading &&
    hasChanges &&
    isReadyForProductPrimaryAction(publishRequirements);
  const isSubmitting = isPending || imageUploadState.isUploading;

  return {
    categories,
    control,
    currentCurrency,
    errors,
    handleBack,
    handleFormSubmit: handleSubmit(onSubmit),
    imageUploadState,
    isCategoriesError: Boolean(categoriesError),
    isCategoriesLoading,
    isEditMode,
    isFormValid,
    isPending,
    isPreorder,
    isProductError: isEditMode && Boolean(productError),
    isProductLoading: isEditMode && isProductLoading,
    isSubmitting,
    publishRequirements,
    resetForm,
    retryLoadCategories,
    retryLoadProduct,
  };
};
