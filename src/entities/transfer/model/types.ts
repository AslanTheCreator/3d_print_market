import { Currency } from "@/shared/model/types";

export type ShoppingMethods =
  | "PRODUCT_PICKUP"
  | "TRANSPORT_COMPANY"
  | "RUSSIAN_POST"
  | "FREE_POST";

export interface TransferBaseModel {
  id: number;
  sending: ShoppingMethods;
  price: number;
  currency: Currency;
  participantId: number;
}

export interface TransferCreateModel
  extends Omit<TransferBaseModel, "id" | "participantId"> {
  imageId: number;
}
