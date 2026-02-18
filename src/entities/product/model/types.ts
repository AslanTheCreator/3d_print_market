import { Currency, Availability } from "@/shared/types";

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
