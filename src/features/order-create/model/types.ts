import type { ProductBasket } from "@/entities/cart";
import type { Address } from "@/entities/address";
import type { DeliveryCarrier, OrderCreateModel } from "@/entities/order";

export interface OrderResult {
  productId: number;
  productName: string;
  status: "success" | "error" | "unknown";
  errorMessage?: string;
  errorCode?: string;
  retryable?: boolean;
  cartItemChanged?: boolean;
}

export type OrderToCreate = OrderCreateModel & {
  productName: string;
};

export interface CheckoutResult {
  batchError?: string;
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
  carrierDelivery?: { deliveryCarrier: DeliveryCarrier | ""; deliveryAddress: string };
}

export interface UseOrderCreateSubmitProps {
  cartItems: ProductBasket[] | undefined;
  checkoutState: OrderCreateCheckoutState;
  onSuccess: (result: CheckoutResult) => void;
  onPartialSuccess: (result: CheckoutResult) => void;
  onError: (result: CheckoutResult) => void;
}
