import type { RegisterOptions } from "react-hook-form";
import type { Currency } from "@/shared/types";
import type {
  EditableAvailability,
  ProductCreateModel,
  ProductDetail,
} from "./types";

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

export const validateProductCount = (value: string, mode: "create" | "edit" = "create"): true | string => {
  if (mode === "edit" && value.trim() === "") return true;
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) return "Введите безопасное целое число";
  if (Number(value) < (mode === "edit" ? 0 : 1)) return mode === "edit" ? "Количество не может быть отрицательным" : "Количество должно быть больше 0";
  return true;
};

export const productCountRules: RegisterOptions<ProductFormData, "count"> = {
  required: "Введите количество товара",
  validate: value => validateProductCount(value),
};

export const productEditCountRules: RegisterOptions<ProductFormData, "count"> = {
  validate: value => validateProductCount(value, "edit"),
};

const isPositiveMoney = (value: string) => /^\d+(\.\d{1,2})?$/.test(value) && Number.isFinite(Number(value)) && Number(value) > 0;

export const productPriceRules: RegisterOptions<ProductFormData, "price"> = {
  required: "Введите цену товара",
  pattern: {
    value: /^\d+(\.\d{1,2})?$/,
    message: "Введите корректную цену",
  },
  validate: (value) =>
    isPositiveMoney(value) || "Введите конечную цену больше нуля",
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
    isPositiveMoney(value) || "Введите конечную сумму больше нуля",
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
  mode: "create" | "edit" = "create",
): ProductCreateModel | null => {
  if (!isEditableAvailability(formData.availability) ||
      validateProductCount(formData.count, mode) !== true || !isPositiveMoney(formData.price) ||
      (formData.availability === "PREORDER" && !isPositiveMoney(formData.prepaymentAmount))) {
    return null;
  }

  return {
    count: formData.count.trim() === "" ? null : Number(formData.count),
    categoryIds: formData.categoryIds,
    name: formData.name.trim(),
    imageIds,
    price: Number(formData.price),
    currency: formData.currency,
    description: formData.description.trim(),
    availability: formData.availability,
    prepaymentAmount: formData.availability === "PREORDER"
      ? Number(formData.prepaymentAmount)
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
    count: product.count === null ? "" : String(product.count),
    originality: product.originality,
    externalUrl: product.externalUrl ?? "",
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
