import { AddressBaseModel } from "@/entities/address/model/types";
import { ImageResponse } from "@/entities/image/model/types";
import { TransferBaseModel } from "@/entities/transfer/model/types";

type UserStatus = "ACTIVE" | "BLOCKED" | "DELETED";
type TransferMoney = "BANK_CARD" | "BANK_SBP" | "CASH";

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
  status: UserStatus;
  imageIds: number[];
  addresses: AddressBaseModel[];
  password: string;
  accounts: Account[];
  transfers: TransferBaseModel[];
}

export interface UserFindModel {
  id: number;
  login: string;
  country: string;
  city: string;
  imageId: number;
  experience: string;
  orderCompletedCount: number;
  orderPurchaseCount: number;
  deadlineSending: number;
  deadlinePayment: number;
  sellerStatus: "DEFAULT" | "VIP" | "PRO"; // создать тип
  averageRating: number;
  transferMoneys: TransferMoney[];
}

export interface UserUpdateModel
  extends Omit<UserBaseModel, "id" | "login" | "status"> {}

interface Account {
  id: number;
  transferMoney: TransferMoney;
  username: string;
  entityValue: string;
  comment: string;
  participantId: number;
}
