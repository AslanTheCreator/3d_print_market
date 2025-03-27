import { ImageResponse } from "@/entities/image/model/types";
import { ProductBaseModel } from "@/shared/types";

type Currency = "RUB" | "USD" | "EUR" | "GBP" | "JPY" | "CNY";
type Status = "Active" | "Cancelled" | "Completed";
type Category = { id: number; name: string };

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
