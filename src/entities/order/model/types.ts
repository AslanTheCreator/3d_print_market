import type { Address } from "@/entities/address/@x/order";
import type { Product, ProductDto } from "@/entities/product/@x/order";
import type { Transfer } from "@/entities/transfer/@x/order";
import type { Currency } from "@/shared/types";

export type OrderStatus =
  | "BOOKED"
  | "AWAITING_PREPAYMENT"
  | "AWAITING_PREPAYMENT_APPROVAL"
  | "AWAITING_PAYMENT"
  | "AWAITING_PAYMENT_APPROVAL"
  | "ASSEMBLING"
  | "ON_THE_WAY"
  | "DISPUTED"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED";

interface OrderTransfer {
  transferId: number;
  addressId: number;
  imageId: number | null;
  address: string;
  price: number | null;
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

export type OrderCreateModel = {
  productId: number;
  count: number;
  comment?: string;
} & (
  | { addressId: number; transferId: number; deliveryCarrier?: never; deliveryAddress?: never }
  | { deliveryCarrier: DeliveryCarrier; deliveryAddress: string; addressId?: never; transferId?: never }
);

export type DeliveryCarrier = "OZON" | "YANDEX" | "RUSSIAN_POST";

export interface OrderGetDataModel {
  addresses: Address[];
  sellerTransfers: Transfer[];
}

export interface OrderCalculationDto {
  known: boolean;
  currency: Currency | "CREATE" | null;
  scale: number;
  goodsAmount: string | null;
  deliveryAmount: string | null;
  totalAmount: string | null;
  confirmedPaidAmount: string | null;
  remainingAmount: string | null;
}

export interface ListOrdersModel {
  deliveryCarrier?: DeliveryCarrier | null;
  deliveryAddress?: string | null;
  calculation?: OrderCalculationDto | null;
  termsVersion?: number | null;
  orderId: number;
  actualStatus: OrderStatus;
  totalPrice: number | null;
  prepaymentAmount: number | null;
  createdAt: string;
  userInfo: OrderUserInfo;
  product: Product & { count: number };
  transfer: OrderTransfer;
  images: number[];
  paymentProofImageId?: number | null;
  canLeaveReview?: boolean;
  reviewId?: number | null;
  deliveryUrl: string | null;
  histories: OrderHistory[];
}

export interface ListOrdersDto extends Omit<ListOrdersModel, "product"> {
  product: ProductDto & { count: number };
}

export interface OrderCancel {
  closureReason: string;
  comment: string;
}
