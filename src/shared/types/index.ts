export type Currency = "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "RUB";
type Status = "ACTIVE" | "DELETED";
type Category = { id: number; name: string };

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
  category: Category;
}
