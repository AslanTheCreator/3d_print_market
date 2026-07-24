import type React from "react";
import { Chip } from "@mui/material";
import type { ShippingMethod } from "@/entities/transfer";
import { FREE_METHODS, type TransferFormItem } from "./model";

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

  if (item.price > 0) {
    return (
      <Chip
        size="small"
        label={`${item.price} ${currencyLabels[item.currency] ?? item.currency}`}
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
