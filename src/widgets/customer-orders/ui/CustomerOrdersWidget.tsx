"use client";
import { useCustomerOrders } from "@/entities/order";
import { useAuth } from "@/features/auth";
import { UnifiedOrdersWidget } from "@/widgets/unified-orders";

export const CustomerOrdersWidget = () => {
  const { isAuthenticated } = useAuth();

  return (
    <UnifiedOrdersWidget
      query={useCustomerOrders({ enabled: isAuthenticated })}
      userRole="customer"
    />
  );
};