import { ImageResponse } from "@/entities/image";
import { Review } from "@/entities/reviews/model/types";
import { Currency } from "@/shared/types";
import { CategoryModel } from "@/entities/category/model/types";

export type Availability = "PURCHASABLE" | "PREORDER" | "EXTERNAL_ONLY";
type Status = "ACTIVE" | "DELETED";

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
  sellerLogin: string;
  sellerRating: number;
  totalReviews: number;
  createdAt: string; // ISO date string
}

export interface Product extends ProductDto {
  image: ImageResponse[];
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
  image: ImageResponse[];
}

export interface ProductCreateModel {
  name: string;
  description: string;
  price: number;
  prepaymentAmount: number;
  categoryIds: number[];
  count: number | null; // null - неограниченное количество
  currency: Currency;
  originality: string;
  availability: Availability;
  externalUrl?: string;
  imageIds: number[];
}
