"use client";

import { useCustomerOrders } from "@/entities/order";
import OrderDetails from "@/widgets/order-details/ui/OrderDetails";

export const CustomerOrdersWidget = () => {
  return (
    <OrderDetails
      title={"Заказы"}
      query={useCustomerOrders()}
      userRole="customer"
    />
  );
};
