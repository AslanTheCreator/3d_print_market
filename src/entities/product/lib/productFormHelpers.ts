import { Availability } from "@/entities/product/model/types";
import { Currency } from "@/shared/model/types";

export interface ProductFormData {
  categoryId: string;
  name: string;
  price: string;
  currency: Currency;
  description: string;
  isPreorder: boolean;
  prepaymentAmount: string;
}

export interface CreateProductData {
  categoryId: number;
  name: string;
  imageIds: number[];
  price: number;
  currency: Currency;
  description: string;
  availability: Availability;
  prepaymentAmount: number;
  count: number;
  originality: string;
  externalUrl?: string;
}

export const createProductData = (
  formData: ProductFormData,
  imageIds: number[]
): CreateProductData => ({
  categoryId: parseInt(formData.categoryId),
  name: formData.name,
  imageIds,
  price: parseFloat(formData.price),
  currency: formData.currency,
  description: formData.description,
  availability: formData.isPreorder ? "PREORDER" : "PURCHASABLE",
  prepaymentAmount: formData.isPreorder
    ? parseFloat(formData.prepaymentAmount)
    : 0,
  count: 1,
  originality: "ORIGINAL",
  externalUrl: undefined,
});
