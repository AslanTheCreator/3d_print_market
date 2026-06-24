import type { ReactNode } from "react";
import {
  type ProductFormData,
  mapFormDataToCreateModel,
  useCreateProduct,
  useUpdateProduct,
} from "@/entities/product";
import { clearProductFormDraft } from "./productFormDraft";
import { getCreateProductErrorNotification } from "./getCreateProductErrorNotification";

const SUCCESS_REDIRECT_DELAY_MS = 1500;

type NotificationSeverity = "success" | "error" | "warning" | "info";
type ShowNotification = (
  message: ReactNode,
  severity?: NotificationSeverity,
) => void;

interface CreateProductFormSubmitHandlerParams {
  createProduct: ReturnType<typeof useCreateProduct>["mutate"];
  effectiveImageIds: number[];
  hasSellerAccount: boolean;
  hasSellerSocialNetwork: boolean;
  hasSellerTransfer: boolean;
  isEditMode: boolean;
  productId: string | undefined;
  resetForm: () => void;
  showNotification: ShowNotification;
  updateProduct: ReturnType<typeof useUpdateProduct>["mutate"];
  navigateToProductList: () => void;
}

export const createProductFormSubmitHandler = ({
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
  navigateToProductList,
}: CreateProductFormSubmitHandlerParams) => {
  return (data: ProductFormData) => {
    if (!effectiveImageIds.length) {
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

    const productData = mapFormDataToCreateModel(data, effectiveImageIds);

    if (isEditMode && productId) {
      updateProduct(
        {
          productId: Number(productId),
          data: productData,
        },
        {
          onSuccess: () => {
            showNotification("Товар успешно обновлён", "success");
            setTimeout(navigateToProductList, SUCCESS_REDIRECT_DELAY_MS);
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
        setTimeout(navigateToProductList, SUCCESS_REDIRECT_DELAY_MS);
      },
      onError: (error) => {
        const notification = getCreateProductErrorNotification(error);
        showNotification(notification.message, notification.severity);
      },
    });
  };
};
