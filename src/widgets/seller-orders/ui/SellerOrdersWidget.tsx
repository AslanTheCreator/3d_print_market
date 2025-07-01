"use client";

import { useSellerOrders } from "@/entities/order/api/queries";
import OrderDetails from "@/widgets/order-details/ui/OrderDetails";

export const SellerOrdersWidget = () => {
  return (
    <OrderDetails
      title={"Проданные товары"}
      query={useSellerOrders()}
      userRole="seller"
    />
  );
};
