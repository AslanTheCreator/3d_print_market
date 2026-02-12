import { AccountsBaseModel } from "@/entities/accounts/model/types";
import { Address } from "@/entities/address/model/types";
import { ImageResponse } from "@/entities/image";
import { SocialNetwork } from "@/entities/social-networks";
import { Transfer } from "@/entities/transfer/model/types";

type UserStatus = "ACTIVE" | "BLOCKED" | "DELETED";
type TransferMoney = "BANK_CARD" | "BANK_SBP" | "CASH";
type SellerStatus = "DEFAULT" | "VIP" | "PRO";

export interface UserProfileModel extends Pick<
  UserBaseModel,
  "id" | "fullName" | "login"
> {
  role: string;
  email: string;
  imageId: number | null;
  image: ImageResponse[];
  exp: number;
  type: string;
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
  imageId: number | null;
  image: ImageResponse[];
  addresses: Address[];
  accounts: AccountsBaseModel[];
  transfers: Transfer[];
  socialNetworks: SocialNetwork[];
}

export interface UserFindModel {
  id: number;
  login: string;
  country: string;
  city: string;
  imageId: number | null;
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
  imageId: number | null;
}

export interface ChangePasswordParams {
  oldPassword: string;
  newPassword: string;
}
