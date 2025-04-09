import { CategoryModel } from "./category";

export type Currency = "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "RUB";
type Status = "ACTIVE" | "DELETED";

export interface ProductBaseModel {
  id: number;
  name: string;
  description: string;
  price: number;
  count: number;
  currency: Currency;
  originality: string;
  participantId: number;
  status: Status;
  category: CategoryModel;
}
