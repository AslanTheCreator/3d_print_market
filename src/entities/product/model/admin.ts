import type { ProductCreateModel, ProductDetailDto } from "./types";

export interface AdminProductDto {
  id: number;
  participantId: number;
  name: string;
  description: string;
  price: number;
  prepaymentAmount: number | null;
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
export function mapAdminProductToInput({ product, categoryIds, imageIds }: AdminProductEditorData): AdminProductInput {
  return {
    name: product.name, description: product.description, price: product.price,
    prepaymentAmount: product.prepaymentAmount ?? 0, count: product.count,
    currency: product.currency, originality: product.originality,
    availability: "EXTERNAL_PRODUCT", externalUrl: product.externalUrl ?? "", categoryIds, imageIds,
  };
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
