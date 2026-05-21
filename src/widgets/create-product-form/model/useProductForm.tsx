"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import {
  ProductFormData,
  defaultProductFormValues,
  mapFormDataToCreateModel,
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
import { getCreateProductErrorNotification } from "./getCreateProductErrorNotification";
import {
  clearProductFormDraft,
  loadProductFormDraftImages,
  readProductFormDraft,
  writeProductFormDraft,
} from "./productFormDraft";

const PRODUCT_LIST_PATH = "/dashboard/products";
const SUCCESS_REDIRECT_DELAY_MS = 1500;

interface UseProductFormOptions {
  mode?: "create" | "edit";
  productId?: string;
}

const normalizeProductFormValues = (
  values: Partial<ProductFormData>,
): ProductFormData => ({
  ...defaultProductFormValues,
  ...values,
  categoryIds: values.categoryIds ?? defaultProductFormValues.categoryIds,
  currency: values.currency ?? defaultProductFormValues.currency,
  isPreorder: values.isPreorder ?? defaultProductFormValues.isPreorder,
});

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
  const draftRestoreStartedRef = useRef(false);
  const [isDraftReady, setIsDraftReady] = useState(isEditMode);
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
  const imageUploadState = useMultipleImageUpload("PRODUCT", 3);
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

  useEffect(() => {
    if (isEditMode) {
      setIsDraftReady(true);
      return;
    }

    if (draftRestoreStartedRef.current) {
      return;
    }

    draftRestoreStartedRef.current = true;

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
        const draftImages = await loadProductFormDraftImages(draft.imageIds);

        if (isActive) {
          setUploadInitialImages(draftImages);
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
  }, [isEditMode, reset, setUploadInitialImages]);

  useEffect(() => {
    if (isEditMode) {
      return;
    }

    void refetchCurrentUser();
  }, [isEditMode, refetchCurrentUser]);

  useEffect(() => {
    if (isEditMode || !isDraftReady) {
      return;
    }

    writeProductFormDraft({
      values: formValues,
      imageIds: imageUploadState.imageIds,
    });
  }, [formValues, imageUploadState.imageIds, isDraftReady, isEditMode]);

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
  const hasSellerTransfer = isEditMode || (currentUser?.transfers.length ?? 0) > 0;
  const hasSellerAccount = isEditMode || (currentUser?.accounts.length ?? 0) > 0;
  const hasSellerSocialNetwork =
    isEditMode || (currentUser?.socialNetworks.length ?? 0) > 0;

  const publishRequirements = {
    hasImages: imageUploadState.imageIds.length > 0,
    hasCategories: categoryIds.length > 0,
    hasName: name.trim().length > 0,
    hasPrice: price.trim().length > 0,
    hasSellerTransfer,
    hasSellerAccount,
    hasSellerSocialNetwork,
    isSellerSettingsError: !isEditMode && Boolean(currentUserError),
    isSellerSettingsLoading: !isEditMode && isCurrentUserLoading,
  };

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
    reset(defaultProductFormValues);
    imageUploadState.resetImages();
  };

  const handleBack = () => {
    router.back();
  };

  const onSubmit = (data: ProductFormData) => {
    if (!imageUploadState.imageIds.length) {
      showNotification(
        "Пожалуйста, загрузите хотя бы одно изображение товара",
        "error",
      );
      return;
    }

    if (!data.categoryIds.length) {
      showNotification("Пожалуйста, выберите хотя бы одну категорию", "error");
      return;
    }

    if (
      !isEditMode &&
      (!hasSellerTransfer || !hasSellerAccount || !hasSellerSocialNetwork)
    ) {
      showNotification(
        "Заполните недостающие настройки продавца перед публикацией товара",
        "info",
      );
      return;
    }

    const productData = mapFormDataToCreateModel(data, imageUploadState.imageIds);

    if (isEditMode && productId) {
      updateProduct(
        {
          productId: Number(productId),
          data: productData,
        },
        {
          onSuccess: () => {
            showNotification("Товар успешно обновлён", "success");
            setTimeout(
              () => router.push(PRODUCT_LIST_PATH),
              SUCCESS_REDIRECT_DELAY_MS,
            );
          },
          onError: (error) => {
            const notification = getCreateProductErrorNotification(error);
            showNotification(notification.message, notification.severity);
          },
        },
      );

      return;
    }

    createProduct(productData, {
      onSuccess: () => {
        showNotification("Товар успешно создан!", "success");
        clearProductFormDraft();
        resetForm();
        setTimeout(
          () => router.push(PRODUCT_LIST_PATH),
          SUCCESS_REDIRECT_DELAY_MS,
        );
      },
      onError: (error) => {
        const notification = getCreateProductErrorNotification(error);
        showNotification(notification.message, notification.severity);
      },
    });
  };

  const isReadyForPrimaryAction =
    publishRequirements.hasImages &&
    publishRequirements.hasCategories &&
    publishRequirements.hasName &&
    publishRequirements.hasPrice &&
    publishRequirements.hasSellerTransfer &&
    publishRequirements.hasSellerAccount &&
    publishRequirements.hasSellerSocialNetwork &&
    !publishRequirements.isSellerSettingsLoading &&
    !publishRequirements.isSellerSettingsError;

  const hasChanges = isEditMode ? isDirty || hasImageChanges : true;
  const isPending = isCreating || isUpdating;
  const isFormValid =
    isDraftReady &&
    !imageUploadState.isUploading &&
    hasChanges &&
    isReadyForPrimaryAction;
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
