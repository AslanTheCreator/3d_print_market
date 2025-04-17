import { ImageResponse } from "@/entities/image/model/types";
import { Currency } from "@/shared/model/types";

type Status = "ACTIVE" | "BLOCKED" | "DELETED";
type TransferMoney = "BANK_CARD" | "BANK_SBP" | "CASH";
type Sending =
  | "PRODUCT_PICKUP"
  | "TRANSPORT_COMPANY"
  | "RUSSIAN_POST"
  | "FREE_POST";

export interface UserProfileModel
  extends Pick<UserBaseModel, "id" | "fullName" | "login" | "mail"> {
  role: string;
  imageId: number;
  image: ImageResponse[];
}

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

export interface UserUpdateModel
  extends Omit<UserBaseModel, "id" | "login" | "status"> {}

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
