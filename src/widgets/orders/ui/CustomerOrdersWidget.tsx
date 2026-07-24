"use client";
import { useCustomerOrders } from "@/entities/order";
import { useAuth } from "@/entities/session";
import { OrdersWidget } from "./OrdersWidget";

export const CustomerOrdersWidget = () => {
  const { isAuthenticated } = useAuth();

  return (
    <OrdersWidget
      query={useCustomerOrders({ enabled: isAuthenticated })}
      userRole="customer"
    />
  );
};
