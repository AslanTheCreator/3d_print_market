import type { RegisterOptions } from "react-hook-form";
import type { Currency, ProductDetail } from "@/shared/types";
import type { EditableAvailability, ProductCreateModel } from "./types";

/**
 * Данные формы создания/редактирования продукта
 */
export interface ProductFormData {
  categoryIds: number[];
  name: string;
  price: string;
  currency: Currency;
  description: string;
  availability: EditableAvailability;
  prepaymentAmount: string;
  count: string;
  originality: string;
  externalUrl: string;
}

export const productCurrencies: ReadonlyArray<{
  code: Currency;
  symbol: string;
}> = [
  { code: "RUB", symbol: "₽" },
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "JPY", symbol: "¥" },
  { code: "CNY", symbol: "¥" },
];

export const getCurrencySymbol = (currency: Currency) =>
  productCurrencies.find((item) => item.code === currency)?.symbol || "₽";

export const productCategoryRules: RegisterOptions<
  ProductFormData,
  "categoryIds"
> = {
  required: "Выберите хотя бы одну категорию",
  validate: (value) =>
    value.length > 0 || "Необходимо выбрать хотя бы одну категорию",
};

export const productNameRules: RegisterOptions<ProductFormData, "name"> = {
  required: "Введите название товара",
  minLength: {
    value: 3,
    message: "Минимальная длина названия 3 символа",
  },
  maxLength: {
    value: 100,
    message: "Максимальная длина названия 100 символов",
  },
};

export const productCountRules: RegisterOptions<ProductFormData, "count"> = {
  required: "Введите количество товара",
  pattern: {
    value: /^\d+$/,
    message: "Количество должно быть целым числом",
  },
  validate: (value) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) {
      return "Введите корректное число";
    }
    if (numValue < 1) {
      return "Количество должно быть больше 0";
    }
    if (numValue > 999999) {
      return "Максимальное количество: 999999";
    }
    return true;
  },
};

export const productPriceRules: RegisterOptions<ProductFormData, "price"> = {
  required: "Введите цену товара",
  pattern: {
    value: /^\d+(\.\d{1,2})?$/,
    message: "Введите корректную цену",
  },
  validate: (value) =>
    parseFloat(value) > 0 || "Цена должна быть больше нуля",
};

export const productCurrencyRules: RegisterOptions<
  ProductFormData,
  "currency"
> = {
  required: "Выберите валюту",
};

export const productPrepaymentRules: RegisterOptions<
  ProductFormData,
  "prepaymentAmount"
> = {
  required: "Введите сумму предоплаты",
  pattern: {
    value: /^\d+(\.\d{1,2})?$/,
    message: "Введите корректную сумму",
  },
  validate: (value) =>
    parseFloat(value) > 0 || "Сумма должна быть больше нуля",
};

export const productDescriptionRules: RegisterOptions<
  ProductFormData,
  "description"
> = {
  maxLength: {
    value: 1000,
    message: "Максимальная длина описания 1000 символов",
  },
};

/**
 * Преобразует данные формы в модель для создания продукта
 */
export const mapFormDataToCreateModel = (
  formData: ProductFormData,
  imageIds: number[],
): ProductCreateModel | null => {
  if (!isEditableAvailability(formData.availability)) {
    return null;
  }

  return {
    count: parseInt(formData.count, 10) || null,
    categoryIds: formData.categoryIds,
    name: formData.name.trim(),
    imageIds,
    price: parseFloat(formData.price),
    currency: formData.currency,
    description: formData.description.trim(),
    availability: formData.availability,
    prepaymentAmount: formData.availability === "PREORDER"
      ? parseFloat(formData.prepaymentAmount)
      : 0,
    originality: formData.originality,
    externalUrl: formData.externalUrl,
  };
};

export const isEditableAvailability = (
  availability: unknown,
): availability is EditableAvailability =>
  availability === "PURCHASABLE" || availability === "PREORDER";

export const mapProductDetailToFormData = (
  product: ProductDetail,
): ProductFormData | null => {
  if (!isEditableAvailability(product.availability)) {
    return null;
  }

  return {
    categoryIds: product.categories.map((category) => category.id),
    name: product.name,
    price: String(product.price),
    currency: product.currency,
    description: product.description,
    availability: product.availability,
    prepaymentAmount:
      product.availability === "PREORDER" && product.prepaymentAmount > 0
        ? String(product.prepaymentAmount)
        : "",
    count: product.count > 0 ? String(product.count) : "",
    originality: product.originality,
    externalUrl: product.externalUrl,
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
  availability: "PURCHASABLE",
  prepaymentAmount: "",
  count: "",
  originality: "ORIGINAL",
  externalUrl: "",
};
