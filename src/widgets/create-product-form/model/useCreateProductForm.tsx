"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import {
  ProductFormData,
  mapFormDataToCreateModel,
  defaultProductFormValues,
  useCreateProduct,
} from "@/entities/product";
import { useCategories } from "@/entities/category";
import { useMultipleImageUpload } from "@/features/image-upload";
import { useNotification } from "@/shared/ui/notification";
import { getCreateProductErrorNotification } from "./getCreateProductErrorNotification";

const PRODUCT_LIST_PATH = "/dashboard/products";
const SUCCESS_REDIRECT_DELAY_MS = 1500;

export const useCreateProductForm = () => {
  const router = useRouter();
  const {
    data: categories = [],
    isLoading: isCategoriesLoading,
    error: categoriesError,
    refetch: retryLoadCategories,
  } = useCategories();
  const { showNotification } = useNotification();
  const { mutate: createProduct, isPending } = useCreateProduct();
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

  const isPreorder = watch("isPreorder");
  const currentCurrency = watch("currency");

  const resetForm = () => {
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

    const productData = mapFormDataToCreateModel(
      data,
      imageUploadState.imageIds,
    );

    createProduct(productData, {
      onSuccess: () => {
        showNotification("Товар успешно создан!", "success");
        resetForm();
        setTimeout(() => router.push(PRODUCT_LIST_PATH), SUCCESS_REDIRECT_DELAY_MS);
      },
      onError: (error) => {
        const notification = getCreateProductErrorNotification(error);
        showNotification(notification.message, notification.severity);
      },
    });
  };

  const isFormValid = !imageUploadState.isUploading && isDirty;
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
    isFormValid,
    isPending,
    isPreorder,
    isSubmitting,
    resetForm,
    retryLoadCategories,
  };
};
