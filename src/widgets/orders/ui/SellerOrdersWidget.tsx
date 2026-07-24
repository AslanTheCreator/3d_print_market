"use client";
import { useSellerOrders } from "@/entities/order";
import { useAuth } from "@/entities/session";
import { OrdersWidget } from "./OrdersWidget";

export const SellerOrdersWidget = () => {
  const { isAuthenticated } = useAuth();

  return (
    <OrdersWidget
      query={useSellerOrders({ enabled: isAuthenticated })}
      userRole="seller"
    />
  );
};
