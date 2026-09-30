import type { ProductCreateModel, ProductDetailDto } from "./types";

export interface AdminProductDto {
  id: number;
  participantId: number;
  name: string;
  description: string;
  price: number;
  prepaymentAmount: number;
  count: number | null;
  currency: ProductDetailDto["currency"];
  originality: string;
  availability: ProductDetailDto["availability"];
  externalUrl: string | null;
  status: ProductDetailDto["status"];
  createdAt: string;
  expirationDate: string;
}
export interface AdminProductInput extends Omit<ProductCreateModel, "availability" | "externalUrl"> {
  availability: "EXTERNAL_PRODUCT";
  externalUrl: string;
}
export interface AdminProductEditorData {
  product: AdminProductDto;
  categoryIds: number[];
  imageIds: number[];
}
export function mergeAdminProduct(product: AdminProductDto, relations: ProductDetailDto): AdminProductEditorData {
  if (product.id !== relations.id || product.participantId !== relations.participantId ||
      !Array.isArray(relations.categories) || !Array.isArray(relations.imageIds) ||
      !relations.categories.every((category) => Number.isSafeInteger(category.id)) ||
      !relations.imageIds.every((id) => Number.isSafeInteger(id))) {
    throw new Error("Категории и изображения не подтверждены. Сохранение недоступно.");
  }
  return { product, categoryIds: relations.categories.map(({ id }) => id), imageIds: relations.imageIds };
}
