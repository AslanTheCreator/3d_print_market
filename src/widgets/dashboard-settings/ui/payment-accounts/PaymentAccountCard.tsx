import type React from "react";
import { AccountBalance, CreditCard, Payments } from "@mui/icons-material";
import { Grid, TextField } from "@mui/material";
import { Controller, type Control, type FieldErrors } from "react-hook-form";
import type { DictionaryItem } from "@/entities/dictionary";
import { CollapsibleFormCard } from "@/shared/ui/collapsible-form-card";
import { PaymentAccountBadge } from "./PaymentAccountBadge";
import {
  trimValue,
  type AccountFormData,
  type AccountFormItem,
} from "./model";

interface PaymentAccountCardProps {
  control: Control<AccountFormData>;
  errors: FieldErrors<AccountFormData>;
  isExpanded: boolean;
  item?: AccountFormItem;
  method: DictionaryItem;
  onMarkUnsaved: () => void;
  onToggleExpand: (key: string) => void;
}

const getPaymentIcon = (value: string): React.ReactElement => {
  switch (value) {
    case "BANK_CARD":
      return <CreditCard />;
    case "BANK_SBP":
      return <AccountBalance />;
    case "CASH":
      return <Payments />;
    default:
      return <CreditCard />;
  }
};

const getEntityLabel = (value: string): string => {
  switch (value) {
    case "BANK_CARD":
      return "Номер карты";
    case "BANK_SBP":
      return "Номер телефона";
    case "CASH":
      return "Способ передачи";
    default:
      return "Реквизиты";
  }
};

const getEntityPlaceholder = (value: string): string => {
  switch (value) {
    case "BANK_CARD":
      return "0000 0000 0000 0000";
    case "BANK_SBP":
      return "+7 (000) 000-00-00";
    case "CASH":
      return "Укажите детали";
    default:
      return "Введите реквизиты";
  }
};

export const PaymentAccountCard = ({
  control,
  errors,
  isExpanded,
  item,
  method,
  onMarkUnsaved,
  onToggleExpand,
}: PaymentAccountCardProps): React.ReactElement => {
  const key = method.value;
  const isEnabled = item?.enabled ?? false;

  return (
    <Controller
      name={`items.${key}.enabled`}
      control={control}
      render={({ field }) => (
        <CollapsibleFormCard
          value={key}
          label={method.description}
          badge={<PaymentAccountBadge item={item} />}
          icon={getPaymentIcon(key)}
          isEnabled={field.value ?? false}
          isExpanded={isExpanded}
          onEnabledChange={(checked) => {
            onMarkUnsaved();
            field.onChange(checked);
          }}
          onToggleExpand={() => onToggleExpand(key)}
        >
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Controller
                name={`items.${key}.username`}
                control={control}
                rules={{
                  validate: (value) => {
                    if (!isEnabled) {
                      return true;
                    }

                    return !!trimValue(value ?? "") || "Укажите имя получателя";
                  },
                }}
                render={({ field: textField }) => (
                  <TextField
                    {...textField}
                    onChange={(event) => {
                      onMarkUnsaved();
                      textField.onChange(event);
                    }}
                    fullWidth
                    label="Имя получателя"
                    placeholder="Иван Иванов"
                    error={!!errors.items?.[key]?.username}
                    helperText={
                      errors.items?.[key]?.username?.message ??
                      "Это имя увидит покупатель"
                    }
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name={`items.${key}.entityValue`}
                control={control}
                rules={{
                  validate: (value) => {
                    if (!isEnabled) {
                      return true;
                    }

                    return !!trimValue(value ?? "") || "Укажите реквизиты";
                  },
                }}
                render={({ field: textField }) => (
                  <TextField
                    {...textField}
                    onChange={(event) => {
                      onMarkUnsaved();
                      textField.onChange(event);
                    }}
                    fullWidth
                    label={getEntityLabel(key)}
                    placeholder={getEntityPlaceholder(key)}
                    error={!!errors.items?.[key]?.entityValue}
                    helperText={
                      errors.items?.[key]?.entityValue?.message ??
                      "Обязательное поле для включенного способа оплаты"
                    }
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name={`items.${key}.comment`}
                control={control}
                render={({ field: textField }) => (
                  <TextField
                    {...textField}
                    onChange={(event) => {
                      onMarkUnsaved();
                      textField.onChange(event);
                    }}
                    fullWidth
                    label="Комментарий"
                    placeholder="Дополнительная информация"
                    helperText="Необязательное поле"
                    multiline
                    rows={2}
                  />
                )}
              />
            </Grid>
          </Grid>
        </CollapsibleFormCard>
      )}
    />
  );
};
