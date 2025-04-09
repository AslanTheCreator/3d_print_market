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
    "id" | "category" | "participantId" | "status"
  > {
  categoryId: number;
  imageIds: number[];
}
