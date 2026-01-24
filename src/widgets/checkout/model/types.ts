import { CartProductModel } from "@/entities/cart";
import {
  ShoppingMethods,
  TransferBaseModel,
} from "@/entities/transfer/model/types";

// Результат создания одного заказа
export interface OrderResult {
  productId: number;
  productName: string;
  status: "success" | "error";
  errorMessage?: string;
}

// Информация о способе доставки для продавца
export interface SellerDeliveryInfo {
  sellerId: number;
  selectedTransfer: TransferBaseModel | null;
  isFallback: boolean;
  fallbackReason?: string;
  originalMethod?: ShoppingMethods;
}

// Агрегированная информация о доставке
export interface DeliveryResolution {
  // Доступные способы доставки (пересечение всех продавцов)
  availableMethods: ShoppingMethods[];
  // Информация по каждому продавцу
  sellerDeliveryInfo: Map<number, SellerDeliveryInfo>;
  // Есть ли fallback'и
  hasFallbacks: boolean;
  // Сообщения о fallback'ах для UI
  fallbackMessages: string[];
}

// Данные для создания заказа (расширенные)
export interface OrderToCreate {
  productId: number;
  productName: string;
  count: number;
  addressId: number;
  transferId: number;
  sellerId: number;
  comment: string;
}

// Итоговый результат оформления
export interface CheckoutResult {
  success: OrderResult[];
  failed: OrderResult[];
  totalCount: number;
  successCount: number;
}
