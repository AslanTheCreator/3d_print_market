export interface DictionaryItem {
  type: string;
  value: string;
  description: string;
}

export type DictionaryType =
  | "SHOPPING_METHODS"
  | "SOCIAL_NETWORK"
  | "CURRENCY"
  | "TRANSFER_MONEY"
  | "DEADLINE_SENDING"
  | "DEADLINE_PAYMENT";
