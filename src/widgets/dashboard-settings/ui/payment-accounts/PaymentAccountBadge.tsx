import type React from "react";
import { Chip } from "@mui/material";
import { trimValue, type AccountFormItem } from "./model";

interface PaymentAccountBadgeProps {
  item?: AccountFormItem;
  method: string;
}

export const PaymentAccountBadge = ({
  item,
  method,
}: PaymentAccountBadgeProps): React.ReactElement => {
  if (!item?.enabled) {
    return <Chip size="small" label="Не включен" variant="outlined" />;
  }

  const entity = trimValue(item.entityValue);
  const username = trimValue(item.username);

  if (entity) {
    return <Chip size="small" label={method === "BANK_CARD" ? `•••• ${entity.replace(/\s/g, "").slice(-4)}` : entity} color="primary" variant="outlined" />;
  }

  if (username) {
    return <Chip size="small" label={username} color="primary" variant="outlined" />;
  }

  return (
    <Chip
      size="small"
      label="Нужно заполнить данные"
      color="warning"
      variant="outlined"
    />
  );
};
