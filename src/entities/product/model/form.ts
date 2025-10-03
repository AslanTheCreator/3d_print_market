import { Currency } from "@/shared/types";
import { Availability, ProductCreateModel } from "./types";

/**
 * Данные формы создания/редактирования продукта
 */
export interface ProductFormData {
  categoryIds: number[];
  name: string;
  price: string;
  currency: Currency;
  description: string;
  isPreorder: boolean;
  prepaymentAmount: string;
}

/**
 * Преобразует данные формы в модель для создания продукта
 */
export const mapFormDataToCreateModel = (
  formData: ProductFormData,
  imageIds: number[]
): ProductCreateModel => {
  const availability: Availability = formData.isPreorder
    ? "PREORDER"
    : "PURCHASABLE";

  return {
    categoryIds: formData.categoryIds,
    name: formData.name.trim(),
    imageIds,
    price: parseFloat(formData.price),
    currency: formData.currency,
    description: formData.description.trim(),
    availability,
    prepaymentAmount: formData.isPreorder
      ? parseFloat(formData.prepaymentAmount)
      : 0,
    count: 1,
    originality: "ORIGINAL",
    externalUrl: "", // Можно настроить позже, если потребуется
  };
};

/**
 * Значения по умолчанию для формы
 */
export const defaultProductFormValues: ProductFormData = {
  categoryIds: [],
  name: "",
  price: "",
  currency: "RUB",
  description: "",
  isPreorder: false,
  prepaymentAmount: "",
};
