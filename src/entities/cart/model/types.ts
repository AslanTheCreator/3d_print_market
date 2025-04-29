import { ImageResponse } from "@/entities/image/model/types";
import { ProductBaseModel } from "@/shared/model/types";

export interface CartResponseModel {
  totalElements: number;
  page: number;
  content: CartProductModel[];
}

export interface CartProductModel
  extends Omit<
    ProductBaseModel,
    "description" | "originality" | "participantId" | "status"
  > {
  imageId: number;
  image: ImageResponse[];
}
