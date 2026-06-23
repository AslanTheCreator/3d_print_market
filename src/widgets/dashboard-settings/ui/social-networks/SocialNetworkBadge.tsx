import type React from "react";
import { Chip } from "@mui/material";
import { trimValue, type SocialFormItem } from "./model";

interface SocialNetworkBadgeProps {
  item?: SocialFormItem;
}

export const SocialNetworkBadge = ({
  item,
}: SocialNetworkBadgeProps): React.ReactElement => {
  if (!item?.enabled) {
    return <Chip size="small" label="Не включен" variant="outlined" />;
  }

  const login = trimValue(item.login);
  if (login) {
    return <Chip size="small" label={login} color="primary" variant="outlined" />;
  }

  return (
    <Chip
      size="small"
      label="Нужно указать логин"
      color="warning"
      variant="outlined"
    />
  );
};
