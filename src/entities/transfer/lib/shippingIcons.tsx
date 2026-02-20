import React from "react";
import { LocalShipping, Store, Mail } from "@mui/icons-material";
import { ShippingMethod } from "@/shared/types";

/**
 * Иконки для методов доставки
 */
export const SHIPPING_ICONS: Record<ShippingMethod, React.ReactNode> = {
  PRODUCT_PICKUP: <Store />,
  TRANSPORT_COMPANY: <LocalShipping />,
  RUSSIAN_POST: <Mail />,
  FREE_POST: <LocalShipping />,
};

/**
 * Получить иконку для метода доставки
 */
export const getDeliveryIcon = (method: ShippingMethod): React.ReactNode => {
  return SHIPPING_ICONS[method] ?? <LocalShipping />;
};
