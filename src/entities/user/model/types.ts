import { Currency } from "@/shared/types";

type Status = "ACTIVE" | "BLOCKED" | "DELETED";
type TransferMoney = "BANK_CARD" | "BANK_SBP" | "CASH";
type Sending =
  | "PRODUCT_PICKUP"
  | "TRANSPORT_COMPANY"
  | "RUSSIAN_POST"
  | "FREE_POST";

export interface User {
  id: number;
  login: string;
  mail: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  status?: string;
  imageIds: string;
}

export interface UserProfileModel
  extends Pick<UserBaseModel, "id" | "fullName"> {}

export interface UserBaseModel {
  id: number;
  login: string;
  mail: string;
  fullName: string;
  phoneNumber: string;
  status: Status;
  imageIds: number[];
  addresses: Adress[];
  password: string;
  accounts: Account[];
  transfers: Transfer[];
}

interface Adress {
  id: number;
  country: string;
  city: string;
  street: string;
  houseNumber: string;
  apartmentNumber: string;
  index: number;
  fullAddress: string;
}

interface Account {
  id: number;
  transferMoney: TransferMoney;
  username: string;
  entityValue: string;
  comment: string;
  participantId: number;
}

interface Transfer {
  id: number;
  sending: Sending;
  price: number;
  currency: Currency;
  participantId: number;
}
