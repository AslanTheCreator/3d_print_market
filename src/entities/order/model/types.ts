import { AddressBaseModel } from "@/entities/address/model/types";
import { ProductCardModel } from "@/entities/product";
import { TransferBaseModel } from "@/entities/transfer/model/types";
import { Currency } from "@/shared/model/types";

type OrderStatus =
  | "BOOKED"
  | "AWAITING_PAYMENT"
  | "ASSEMBLING"
  | "ON_THE_WAY"
  | "RECEIVED"
  | "DISPUTED"
  | "COMPLETED"
  | "FAILED";

interface OrderTransfer {
  transferId: number;
  addressId: number;
  imageId: number;
  address: string;
  price: number;
  currency: Currency;
}

interface OrderHistory {
  status: OrderStatus;
  comment: string;
  changedAt: string;
}

interface OrderUserInfo {
  id: number;
  imageId: number;
  login: string;
  phoneNumber: string;
  mail: string;
}

export interface OrderCreateModel {
  productId: number;
  count: number;
  addressId: number;
  transferId: number;
  comment: string;
}

export interface OrderGetDataModel {
  addresses: AddressBaseModel[];
  sellerTransfers: TransferBaseModel[];
}

export interface ListOrdersModel {
  orderId: number;
  actualStatus: OrderStatus;
  totalPrice: number;
  createdAt: string;
  userInfo: OrderUserInfo;
  product: ProductCardModel;
  transfer: OrderTransfer;
  images: number[];
  histories: OrderHistory[];
}
