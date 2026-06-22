import type { ProductBasket } from "@/entities/cart";
import type { Transfer } from "@/shared/types";

// Результат создания одного заказа
export interface OrderResult {
  productId: number;
  productName: string;
  status: "success" | "error";
  errorMessage?: string;
}

export interface SellerCheckoutGroup {
  sellerId: number;
  sellerLogin: string;
  items: ProductBasket[];
  transfers: Transfer[];
  selectedTransfer: Transfer | null;
  isActive: boolean;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
}

export interface SelectedSellerDelivery {
  sellerId: number;
  sellerLogin: string;
  transfer: Transfer;
}

// Данные для создания заказа (расширенные)
export interface OrderToCreate {
  productId: number;
  productName: string;
  count: number;
  addressId: number;
  transferId: number;
  comment: string;
}

// Итоговый результат оформления
export interface CheckoutResult {
  success: OrderResult[];
  failed: OrderResult[];
  totalCount: number;
  successCount: number;
}
