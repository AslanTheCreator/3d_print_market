import type { ProductCreateModel, ProductDetailDto } from "./types";
import { giveawaySettingsFingerprint, mapGiveawaySettings, toGiveawaySettingsRequest, type GiveawaySettingsValues } from "./giveawaySettings";
import type { AdminGiveawayProductResponse } from "./giveaway";

export interface AdminProductDto {
  id: number;
  participantId: number;
  name: string;
  description: string;
  price: number;
  prepaymentAmount: number | null;
  count: number | null;
  currency: ProductDetailDto["currency"] | "CREATE";
  originality: string;
  availability: ProductDetailDto["availability"];
  externalUrl: string | null;
  status: ProductDetailDto["status"];
  createdAt: string;
  expirationDate: string;
  used?: boolean;
  giveawayEnabled?: boolean | null;
  giveawayTelegramUrl?: string | null;
  giveawayStartAt?: string | null;
  giveawayEndAt?: string | null;
  giveawayWinnersCount?: number | null;
  giveawayRules?: string | null;
  giveawayHomeText?: string | null;
}
type AdminProductFields = Omit<ProductCreateModel, "availability" | "externalUrl" | "currency"> & { currency: AdminProductDto["currency"]; used?: boolean };
export type AdminProductInput = AdminProductFields & (
  { availability: "EXTERNAL_PRODUCT"; externalUrl: string; giveaway?: never } |
  { availability: "GIVEAWAY"; externalUrl: string; giveaway: GiveawaySettingsValues }
);
export interface AdminProductRelations {
  id: number; participantId: number; availability: ProductDetailDto["availability"];
  categories: { id: number }[]; imageIds: number[]; product?: AdminProductDto;
}
export interface AdminProductEditorData {
  product: AdminProductDto;
  categoryIds: number[];
  imageIds: number[];
}
export function mapAdminProductToInput({ product, categoryIds, imageIds }: AdminProductEditorData): AdminProductInput {
  const fields = {
    name: product.name, description: product.description, price: product.price,
    prepaymentAmount: product.prepaymentAmount ?? 0, count: product.count,
    currency: product.currency, originality: product.originality,
    externalUrl: product.externalUrl ?? "", categoryIds: [...categoryIds], imageIds: [...imageIds],
    ...(typeof product.used === "boolean" ? { used: product.used } : {}),
  };
  if (product.availability === "GIVEAWAY") return { ...fields, availability: "GIVEAWAY", giveaway: mapGiveawaySettings(product) };
  if (product.availability !== "EXTERNAL_PRODUCT") throw new Error("Этот тип товара недоступен в редакторе бота");
  return { ...fields, availability: "EXTERNAL_PRODUCT" };
}
export function mergeAdminProduct(product: AdminProductDto, relations: AdminProductRelations): AdminProductEditorData {
  if (product.id !== relations.id || product.participantId !== relations.participantId ||
      product.availability !== relations.availability ||
      !Array.isArray(relations.categories) || !Array.isArray(relations.imageIds) ||
      !relations.categories.every((category) => Number.isSafeInteger(category.id) && category.id > 0) ||
      !relations.imageIds.every((id) => Number.isSafeInteger(id) && id > 0)) {
    throw new Error("Категории и изображения не подтверждены. Сохранение недоступно.");
  }
  if (product.availability === "GIVEAWAY" && (!relations.product || relations.product.id !== product.id || relations.product.participantId !== product.participantId))
    throw new Error("Полный snapshot розыгрыша не подтверждён");
  return { product: relations.product ?? product, categoryIds: relations.categories.map(({ id }) => id), imageIds: [...relations.imageIds] };
}

export function giveawayProductRelations(data: AdminGiveawayProductResponse): AdminProductRelations {
  const product = data.product;
  if (!product || product.availability !== "GIVEAWAY" || typeof product.giveawayEnabled !== "boolean" ||
      !Number.isSafeInteger(product.id) || !Number.isSafeInteger(product.participantId) ||
      [product.name, product.description, product.currency, product.originality, product.status].some(value => typeof value !== "string") ||
      !Number.isFinite(product.price) || (product.prepaymentAmount !== null && !Number.isFinite(product.prepaymentAmount)) ||
      (product.count !== null && (!Number.isSafeInteger(product.count) || product.count! < 0)) ||
      !Array.isArray(data.categories) || !Array.isArray(data.imageIds) ||
      !data.categories.every(category => Number.isSafeInteger(category.id) && category.id! > 0) ||
      !data.imageIds.every(id => Number.isSafeInteger(id) && id > 0)) throw new Error("Категории, изображения или поля розыгрыша не подтверждены. Сохранение недоступно.");
  return { id: product.id!, participantId: product.participantId!, availability: "GIVEAWAY",
    categories: data.categories.map(category => ({ id: category.id! })), imageIds: [...data.imageIds], product: product as AdminProductDto };
}

export function adminProductInputFingerprint(input: AdminProductInput) {
  return JSON.stringify({ ...input, categoryIds: [...input.categoryIds].sort((a, b) => a - b), imageIds: input.imageIds,
    ...(input.availability === "GIVEAWAY" ? { count: null, prepaymentAmount: 0, giveaway: giveawaySettingsFingerprint(input.giveaway) } : {}) });
}
export function adminProductMatchesInput(data: AdminProductEditorData, input: AdminProductInput) {
  const actual = mapAdminProductToInput(data);
  // Неотправленное optional поле не является частью подтверждаемого намерения.
  return adminProductInputFingerprint({ ...actual, used: input.used === undefined ? undefined : actual.used }) === adminProductInputFingerprint(input);
}
export const adminProductBaseline = (data: AdminProductEditorData) => JSON.stringify({ id: data.product.id, owner: data.product.participantId,
  status: data.product.status, input: adminProductInputFingerprint(mapAdminProductToInput(data)) });
export function toAdminProductRequest(input: AdminProductInput) {
  if (input.availability !== "EXTERNAL_PRODUCT" && input.availability !== "GIVEAWAY") throw new Error("Недопустимый тип товара");
  const fields = { name: input.name, description: input.description, price: input.price,
    currency: input.currency, originality: input.originality, externalUrl: input.externalUrl, categoryIds: [...input.categoryIds], imageIds: [...input.imageIds],
    ...(input.used !== undefined ? { used: input.used } : {}) };
  // B3: сервер сохраняет count/prepaymentAmount=null; 0 count отклоняется до нормализации.
  return input.availability === "GIVEAWAY" ? { ...fields, availability: "GIVEAWAY" as const, giveaway: toGiveawaySettingsRequest(input.giveaway) }
    : { ...fields, availability: "EXTERNAL_PRODUCT" as const, count: input.count, prepaymentAmount: input.prepaymentAmount };
}
