import type { ProductBasket } from "@/entities/cart";
import type {
  CheckoutResult,
  OrderResult,
  OrderToCreate,
} from "@/features/order-create";
import type { Transfer } from "@/shared/types";

export type { CheckoutResult, OrderResult, OrderToCreate };

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
