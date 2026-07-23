import type { ProductBasket } from "@/entities/cart";
import type { Address } from "@/shared/types";

export interface OrderResult {
  productId: number;
  productName: string;
  status: "success" | "error";
  errorMessage?: string;
  errorCode?: string;
  retryable?: boolean;
}

export interface OrderToCreate {
  productId: number;
  productName: string;
  count: number;
  addressId: number;
  transferId: number;
  comment: string;
}

export interface CheckoutResult {
  success: OrderResult[];
  failed: OrderResult[];
  totalCount: number;
  successCount: number;
}

export interface OrderCreateCheckoutState {
  selectedAddress: Address | null;
  comment: string;
  isReadyToSubmit: boolean;
  getTransferIdForSeller: (sellerId: number) => number | null;
}

export interface UseOrderCreateSubmitProps {
  cartItems: ProductBasket[] | undefined;
  checkoutState: OrderCreateCheckoutState;
  onSuccess: (result: CheckoutResult) => void;
  onPartialSuccess: (result: CheckoutResult) => void;
  onError: (result: CheckoutResult) => void;
}
