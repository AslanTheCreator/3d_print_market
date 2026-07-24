import type {
  AccountsBaseModel,
  TransferMoney,
} from "@/entities/account/@x/user";
import type { Address } from "@/entities/address/@x/user";
import type { ImageMetadata } from "@/entities/image/@x/user";
import type {
  SocialNetwork,
} from "@/entities/social-network/@x/user";
import type { Transfer } from "@/entities/transfer/@x/user";

type UserStatus = "ACTIVE" | "WAITING_VERIFY" | "BLOCKED" | "DELETED";
type SellerStatus = "DEFAULT" | "VIP" | "PRO";

export interface UserProfileModel extends Pick<
  UserBaseModel,
  "id" | "fullName" | "login"
> {
  role: string;
  email: string;
  imageId: number | null;
  image: ImageMetadata[];
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
  image: ImageMetadata[];
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
