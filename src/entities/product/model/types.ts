import type { CategoryModel } from "@/entities/category/@x/product";
import type { ImageMetadata } from "@/entities/image/@x/product";
import type { Review } from "@/entities/review/@x/product";
import type { Currency } from "@/shared/types";

export type Availability = "PURCHASABLE" | "PREORDER" | "EXTERNAL_ONLY";
type Status = "ACTIVE" | "TIME_EXPIRED" | "BLOCKED" | "DELETED";

export interface ProductDto {
  id: number;
  name: string;
  count: number;
  price: number;
  prepaymentAmount: number;
  currency: Currency;
  categories: CategoryModel[];
  imageId: number;
  sellerId: number;
  expirationDate: string;
  status: Status;
  availability: Availability;
  externalUrl: string;
  sellerLogin: string;
  sellerRating: number;
  totalReviews: number;
  createdAt: string;
}

export interface Product extends ProductDto {
  image: ImageMetadata[];
}

export interface ProductDetailDto {
  id: number;
  name: string;
  description: string;
  price: number;
  prepaymentAmount: number;
  count: number;
  currency: Currency;
  originality: string;
  participantId: number;
  status: Status;
  categories: CategoryModel[];
  availability: Availability;
  externalUrl: string;
  imageIds: number[];
  reviews: Review[];
  sellerLogin: string;
  sellerRating: number;
  totalReviews: number;
}

export interface ProductDetail extends ProductDetailDto {
  image: ImageMetadata[];
}

export type EditableAvailability = Exclude<Availability, "EXTERNAL_ONLY">;

export interface ProductCreateModel {
  name: string;
  description: string;
  price: number;
  prepaymentAmount: number;
  categoryIds: number[];
  count: number | null; // null - неограниченное количество
  currency: Currency;
  originality: string;
  availability: EditableAvailability;
  externalUrl?: string;
  imageIds: number[];
}
