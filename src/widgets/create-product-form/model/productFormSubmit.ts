import type { ReactNode } from "react";
import { parsePositiveSafeInteger } from "@/shared/lib";
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
  isCurrentScope: () => boolean;
  createProduct: ReturnType<typeof useCreateProduct>["mutate"];
  effectiveImageIds: number[];
  hasSellerAccount: boolean;
  hasSellerSocialNetwork: boolean;
  hasSellerTransfer: boolean;
  imageIdsToDelete: number[];
  onProductSaved: (imageIdsToDelete: number[]) => Promise<void>;
  isEditMode: boolean;
  isProductReadOnly: boolean;
  productId: string | undefined;
  editTargetId: number | undefined;
  resetForm: () => void;
  showNotification: ShowNotification;
  updateProduct: ReturnType<typeof useUpdateProduct>["mutate"];
  navigateToProductList: () => void;
}

export const createProductFormSubmitHandler = ({
  createProduct,
  isCurrentScope,
  effectiveImageIds,
  hasSellerAccount,
  hasSellerSocialNetwork,
  hasSellerTransfer,
  imageIdsToDelete,
  onProductSaved,
  isEditMode,
  isProductReadOnly,
  productId,
  editTargetId,
  resetForm,
  showNotification,
  updateProduct,
  navigateToProductList,
}: CreateProductFormSubmitHandlerParams) => {
  return (data: ProductFormData) => {
    if (!isCurrentScope()) return;
    const validProductId = parsePositiveSafeInteger(productId);
    if (isEditMode && (validProductId === null || editTargetId !== validProductId)) {
      showNotification("Сначала загрузите редактируемый товар по корректному адресу", "error");
      return;
    }
    if (isProductReadOnly) {
      showNotification(
        "Товар управляется внешним источником и недоступен для редактирования",
        "info",
      );
      return;
    }

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

    const productData = mapFormDataToCreateModel(data, effectiveImageIds, isEditMode ? "edit" : "create");

    if (!productData) {
      showNotification(
        "Проверьте количество, цену и предоплату товара",
        "error",
      );
      return;
    }

    if (isEditMode && validProductId !== null) {
      updateProduct(
        {
          productId: validProductId,
          data: productData,
        },
        {
          onSuccess: () => {
            if (!isCurrentScope()) return;
            void onProductSaved(imageIdsToDelete);
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
        if (!isCurrentScope()) return;
        showNotification("Товар успешно создан!", "success");
        clearProductFormDraft();
        resetForm();
        setTimeout(() => { if (isCurrentScope()) navigateToProductList(); }, SUCCESS_REDIRECT_DELAY_MS);
      },
      onError: (error) => {
        const notification = getCreateProductErrorNotification(error);
        showNotification(notification.message, notification.severity);
      },
    });
  };
};
