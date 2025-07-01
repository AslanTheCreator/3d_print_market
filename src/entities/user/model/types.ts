import { AccountsBaseModel } from "@/entities/accounts/model/types";
import { AddressBaseModel } from "@/entities/address/model/types";
import { ImageResponse } from "@/entities/image/model/types";
import { TransferBaseModel } from "@/entities/transfer/model/types";

type UserStatus = "ACTIVE" | "BLOCKED" | "DELETED";
type TransferMoney = "BANK_CARD" | "BANK_SBP" | "CASH";
type SellerStatus = "DEFAULT" | "VIP" | "PRO";

export interface UserProfileModel
  extends Pick<UserBaseModel, "id" | "fullName" | "login"> {
  role: string;
  email: string;
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
  sellerStatus: SellerStatus;
  averageRating: number;
  totalReviews: number;
  imageIds: number[];
  addresses: AddressBaseModel[];
  accounts: AccountsBaseModel[];
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
  sellerStatus: SellerStatus;
  averageRating: number;
  transferMoneys: TransferMoney[];
}

export interface UserUpdateModel {
  login: string;
  fullName: string;
  phoneNumber: string;
  deadlineSending: number;
  deadlinePayment: number;
  imageIds: number[];
}
