"use client";
import { useCustomerOrders } from "@/entities/order";
import { UnifiedOrdersWidget } from "@/widgets/unified-orders";

export const CustomerOrdersWidget = () => {
  return (
    <UnifiedOrdersWidget query={useCustomerOrders()} userRole="customer" />
  );
};
