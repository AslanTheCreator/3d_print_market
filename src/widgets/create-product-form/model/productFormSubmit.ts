import type { ReactNode } from "react";
import { parsePositiveSafeInteger } from "@/shared/lib";
import {
  type ProductFormData,
  mapFormDataToCreateModel,
  useCreateProduct,
  useUpdateProduct,
} from "@/entities/product";
import { getProductFormDraftRevision } from "./productFormDraft";
import { getCreateProductErrorNotification } from "./getCreateProductErrorNotification";
import type { createProductFormSubmission } from "./productFormSubmission";

type NotificationSeverity = "success" | "error" | "warning" | "info";
type ShowNotification = (
  message: ReactNode,
  severity?: NotificationSeverity,
) => void;

interface CreateProductFormSubmitHandlerParams {
  isCurrentScope: () => boolean;
  submission: ReturnType<typeof createProductFormSubmission>;
  isReadyForSubmit: () => boolean;
  onBusyChange: (busy: boolean) => void;
  createProduct: ReturnType<typeof useCreateProduct>["mutateAsync"];
  effectiveImageIds: number[];
  hasSellerAccount: boolean;
  hasSellerSocialNetwork: boolean;
  hasSellerTransfer: boolean;
  imageIdsToDelete: number[];
  onProductSaved: (values: ProductFormData, imageIds: number[], imageIdsToDelete: number[]) => Promise<void>;
  onProductCreated: (values: ProductFormData, draftRevision: number) => void;
  isEditMode: boolean;
  isProductReadOnly: boolean;
  productId: string | undefined;
  editTargetId: number | undefined;
  showNotification: ShowNotification;
  updateProduct: ReturnType<typeof useUpdateProduct>["mutateAsync"];
  navigateToProductList: () => void;
}

export const createProductFormSubmitHandler = ({
  createProduct,
  isCurrentScope,
  submission,
  isReadyForSubmit,
  onBusyChange,
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
  editTargetId,
  showNotification,
  updateProduct,
  navigateToProductList,
}: CreateProductFormSubmitHandlerParams) => {
  return async (data: ProductFormData) => {
    if (!isCurrentScope()) return;
    const operation = submission.start();
    if (operation === null) return;
    const isCurrent = () => submission.isCurrent(operation) && isCurrentScope();
    try {
      if (!isReadyForSubmit()) return;
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

      const values = { ...data, categoryIds: [...data.categoryIds] };
      const imageIds = [...effectiveImageIds];
      const removedIds = [...imageIdsToDelete];
      const draftRevision = getProductFormDraftRevision();
      const productData = mapFormDataToCreateModel(values, imageIds, isEditMode ? "edit" : "create");

      if (!productData) {
        showNotification(
          "Проверьте количество, цену и предоплату товара",
          "error",
        );
        return;
      }

      onBusyChange(true);
      try {
        if (isEditMode && validProductId !== null) {
          await updateProduct({ productId: validProductId, data: productData });
        } else {
          await createProduct(productData);
        }
      } catch (error) {
        if (isCurrent()) {
          const notification = getCreateProductErrorNotification(error);
          showNotification(notification.message, notification.severity);
        }
        return;
      }
      if (!isCurrent()) return;
      submission.confirm(operation);
      if (isEditMode) {
        await onProductSaved(values, imageIds, removedIds);
      } else {
        onProductCreated(values, draftRevision);
        showNotification("Товар успешно создан!", "success");
        submission.schedule(operation, () => { if (isCurrentScope()) navigateToProductList(); });
      }
    } finally {
      submission.finish(operation);
      if (isCurrent()) onBusyChange(false);
    }
  };
};
