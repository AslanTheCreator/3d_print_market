"use client";
import { useSellerOrders } from "@/entities/order";
import { UnifiedOrdersWidget } from "@/widgets/unified-orders";

export const SellerOrdersWidget = () => {
  return <UnifiedOrdersWidget query={useSellerOrders()} userRole="seller" />;
};
