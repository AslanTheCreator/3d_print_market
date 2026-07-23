import type { ImageMetadata } from "./image";
import type { CategoryModel } from "./category";
import type { Review } from "./review";
import type { Currency } from "./currency";

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
  expirationDate: string; // ISO date string
  status: Status;
  availability: Availability;
  externalUrl: string;
  sellerLogin: string;
  sellerRating: number;
  totalReviews: number;
  createdAt: string; // ISO date string
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
