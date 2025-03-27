import { ProductBaseModel } from "@/shared/types";

export interface CartResponseModel {
  totalElements: number;
  page: number;
  content: CartProductModel[];
}

export interface CartProductModel
  extends Omit<
    ProductBaseModel,
    "description" | "originality" | "participantId" | "status"
  > {}
