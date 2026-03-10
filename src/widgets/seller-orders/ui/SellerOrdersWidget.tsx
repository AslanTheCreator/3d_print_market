"use client";
import { useSellerOrders } from "@/entities/order";
import { useAuth } from "@/features/auth";
import { UnifiedOrdersWidget } from "@/widgets/unified-orders";

export const SellerOrdersWidget = () => {
  const { isAuthenticated } = useAuth();

  return (
    <UnifiedOrdersWidget
      query={useSellerOrders({ enabled: isAuthenticated })}
      userRole="seller"
    />
  );
};