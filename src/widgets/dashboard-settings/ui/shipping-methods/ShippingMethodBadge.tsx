import type React from "react";
import { Chip } from "@mui/material";
import type { ShippingMethod } from "@/entities/transfer";
import { FREE_METHODS, parseShippingPrice, type TransferFormItem } from "./model";

interface ShippingMethodBadgeProps {
  currencyLabels: Record<string, string>;
  item?: TransferFormItem;
  method: ShippingMethod;
}

export const ShippingMethodBadge = ({
  currencyLabels,
  item,
  method,
}: ShippingMethodBadgeProps): React.ReactElement => {
  if (!item?.enabled) {
    return <Chip size="small" label="Не включен" variant="outlined" />;
  }

  if (FREE_METHODS.has(method)) {
    return <Chip size="small" label="Бесплатно" color="success" />;
  }

  const price = parseShippingPrice(item.price);
  if (price !== null && price > 0) {
    return (
      <Chip
        size="small"
        label={`${price} ${({ RUB: "₽", USD: "$", EUR: "€" } as Record<string, string>)[item.currency] ?? currencyLabels[item.currency] ?? item.currency}`}
        color="primary"
        variant="outlined"
      />
    );
  }

  return (
    <Chip
      size="small"
      label="Нужно указать цену"
      color="warning"
      variant="outlined"
    />
  );
};
