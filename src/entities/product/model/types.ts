import { ImageResponse } from "@/entities/image/model/types";
import { ProductBaseModel } from "@/shared/model/types";

export interface ProductResponseModel {
  totalElements: number;
  page: number;
  content: ProductCardModel[];
}

export interface ProductCardModel
  extends Omit<
    ProductBaseModel,
    "description" | "originality" | "participantId" | "status"
  > {
  imageId: number;
  image: ImageResponse[];
}

export interface ProductDetailsModel extends ProductBaseModel {
  imageIds: number[];
  image: ImageResponse[];
}

export interface ProductCreateModel
  extends Omit<
    ProductBaseModel,
    "id" | "category" | "participantId" | "status" | "originality"
  > {
  categoryId: number;
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
  productName?: string;
  categoryId?: number;
  originality?: string;
  participantId?: number;
  priceRange?: PriceRange;
  imageId?: number;
  dateRange?: DateRange;
}

interface Pageable {
  size: number;
  page: number;
}

export interface ProductRequestModel {
  productName?: string;
  categoryId?: number;
  originality?: string;
  participantId?: number;
  priceRange?: PriceRange;
  imageId?: number;
  dateRange?: DateRange;
  pageable: Pageable;
}
