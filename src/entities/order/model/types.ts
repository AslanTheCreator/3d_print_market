import { ProductCardModel } from "@/entities/product";
import { Adress, Transfer } from "@/entities/user";
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

export interface OrderCreateModel {
  productId: number;
  count: number;
  addressId: number;
  transferId: number;
  comment: string;
}

export interface OrderGetDataModel {
  addresses: Adress[];
  sellerTransfers: Transfer[];
}

export interface SellerOrdersModel {
  orderId: number;
  actualStatus: OrderStatus;
  totalPrice: number;
  createdAt: string;
  product: ProductCardModel;
  transfer: OrderTransfer;
  images: number[];
  histories: OrderTransferHistory[];
}

interface OrderTransfer {
  transferId: number;
  addressId: number;
  imageId: number;
  address: string;
  price: number;
  currency: Currency;
}

interface OrderTransferHistory {
  status: OrderStatus;
  comment: string;
  changedAt: string;
}
