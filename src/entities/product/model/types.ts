import { ImageResponse } from "@/entities/image";
import { ReviewModel } from "@/entities/reviews/model/types";
import { Currency } from "@/shared/types";
import { CategoryModel } from "@/entities/category/model/types";

export type Availability = "PURCHASABLE" | "PREORDER" | "EXTERNAL_ONLY";
type Status = "ACTIVE" | "DELETED";

interface BaseProduct {
  id: number;
  name: string;
  price: number;
  currency: Currency;
  categories: CategoryModel[];
  availability: Availability;
}

export interface ProductCardModel extends BaseProduct {
  count: number;
  createdAt: string; // ISO date string
  imageId: number;
  sellerId: number;
  image: ImageResponse[];
}

export interface ProductDetailsModel extends BaseProduct {
  description: string;
  prepaymentAmount: number;
  count: number;
  originality: string;
  participantId: number;
  status: Status;
  externalUrl: string;
  reviews: ReviewModel[];
  imageIds: number[];
  image: ImageResponse[];
  sellerLogin: string;
  sellerRating: number;
}

export interface ProductCreateModel {
  name: string;
  description: string;
  price: number;
  prepaymentAmount: number;
  categoryIds: number[];
  count?: number | null;
  currency: Currency;
  originality: string;
  availability: Availability;
  externalUrl?: string;
  imageIds: number[];
}

// Типы для параметров запроса

interface PriceRange {
  minPrice?: number;
  maxPrice?: number;
}

interface DateRange {
  start?: string;
  end?: string;
}

export interface ProductFilter {
  name?: string;
  categoryId?: number;
  originality?: string;
  participantId?: number;
  priceRange?: PriceRange;
  imageId?: number;
  dateRange?: DateRange;
}

export type SortBy = "DATE_DESC" | "PRICE_ASC" | "PRICE_DESC";

interface Pageable {
  size: number;
  lastCreatedAt?: string;
  lastPrice?: number;
  lastId?: number;
  sortBy?: SortBy;
}

export interface ProductRequestModel extends ProductFilter {
  pageable: Pageable;
}
