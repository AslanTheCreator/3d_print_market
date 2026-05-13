"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
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
import {
  type InitialImageUploadState,
  useMultipleImageUpload,
} from "@/features/image-upload";
import { useNotification } from "@/shared/ui/notification";
import type { ImageMetadata } from "@/shared/types";
import { getImageUrl } from "@/shared/lib";
import { getCreateProductErrorNotification } from "./getCreateProductErrorNotification";

const PRODUCT_LIST_PATH = "/dashboard/products";
const SUCCESS_REDIRECT_DELAY_MS = 1500;

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
    data: product,
    isLoading: isProductLoading,
    error: productError,
    refetch: retryLoadProduct,
  } = useProductById(isEditMode ? productId : undefined);
  const { showNotification } = useNotification();
  const { mutate: createProduct, isPending: isCreating } = useCreateProduct();
  const { mutate: updateProduct, isPending: isUpdating } = useUpdateProduct();
  const imageUploadState = useMultipleImageUpload("PRODUCT", 3);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProductFormData>({
    defaultValues: defaultProductFormValues,
  });

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
    imageUploadState.setInitialImages(nextImages);
  }, [imageUploadState, isEditMode, product, productId, reset]);

  const isPreorder = watch("isPreorder");
  const currentCurrency = watch("currency");
  const categoryIds = watch("categoryIds");
  const name = watch("name");
  const price = watch("price");

  const publishRequirements = {
    hasImages: imageUploadState.imageIds.length > 0,
    hasCategories: categoryIds.length > 0,
    hasName: name.trim().length > 0,
    hasPrice: price.trim().length > 0,
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
    publishRequirements.hasPrice;

  const hasChanges = isEditMode ? isDirty || hasImageChanges : isDirty;
  const isPending = isCreating || isUpdating;
  const isFormValid =
    !imageUploadState.isUploading && hasChanges && isReadyForPrimaryAction;
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
