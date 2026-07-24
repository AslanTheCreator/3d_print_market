import type { Availability, Currency } from "@/shared/types";

export type EditableAvailability = Exclude<Availability, "EXTERNAL_ONLY">;

export interface ProductCreateModel {
  name: string;
  description: string;
  price: number;
  prepaymentAmount: number;
  categoryIds: number[];
  count: number | null; // null - неограниченное количество
  currency: Currency;
  originality: string;
  availability: EditableAvailability;
  externalUrl?: string;
  imageIds: number[];
}
