import { Currency, Address, Product, Transfer } from "@/shared/types";

type OrderStatus =
  | "BOOKED"
  | "AWAITING_PREPAYMENT"
  | "AWAITING_PREPAYMENT_APPROVAL"
  | "AWAITING_PAYMENT"
  | "ASSEMBLING"
  | "ON_THE_WAY"
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
  addresses: Address[];
  sellerTransfers: Transfer[];
}

export interface ListOrdersModel {
  orderId: number;
  actualStatus: OrderStatus;
  totalPrice: number;
  createdAt: string;
  userInfo: OrderUserInfo;
  product: Product;
  transfer: OrderTransfer;
  images: number[];
  histories: OrderHistory[];
}

export interface OrderCancel {
  orderId: number;
  closureReason: string;
  comment: string;
}
