import type React from "react";
import { Grid, MenuItem, TextField } from "@mui/material";
import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { SHIPPING_ICONS } from "@/entities/transfer";
import type { DictionaryItem } from "@/entities/dictionary";
import { CollapsibleFormCard } from "@/shared/ui/collapsible-form-card";
import type { ShippingMethod } from "@/shared/types";
import { ShippingMethodBadge } from "./ShippingMethodBadge";
import {
  DEFAULT_CURRENCY,
  FREE_METHODS,
  REQUIRED_PRICE_METHODS,
  type TransferFormData,
  type TransferFormItem,
} from "./model";

interface ShippingMethodCardProps {
  control: Control<TransferFormData>;
  currencies: DictionaryItem[];
  currencyLabels: Record<string, string>;
  errors: FieldErrors<TransferFormData>;
  isExpanded: boolean;
  item?: TransferFormItem;
  method: DictionaryItem;
  onEnabledChange: (
    key: string,
    checked: boolean,
    onChange: (value: boolean) => void,
  ) => void;
  onMarkUnsaved: () => void;
  onToggleExpand: (key: string) => void;
}

export const ShippingMethodCard = ({
  control,
  currencies,
  currencyLabels,
  errors,
  isExpanded,
  item,
  method,
  onEnabledChange,
  onMarkUnsaved,
  onToggleExpand,
}: ShippingMethodCardProps): React.ReactElement => {
  const key = method.value;
  const shippingMethod = key as ShippingMethod;
  const isEnabled = item?.enabled ?? false;
  const isFree = FREE_METHODS.has(shippingMethod);
  const isRequiredPrice = REQUIRED_PRICE_METHODS.has(shippingMethod);

  return (
    <Controller
      name={`items.${key}.enabled`}
      control={control}
      render={({ field }) => (
        <CollapsibleFormCard
          value={key}
          label={method.description}
          description={
            isRequiredPrice ? "Стоимость доставки обязательна" : undefined
          }
          badge={
            <ShippingMethodBadge
              currencyLabels={currencyLabels}
              item={item}
              method={shippingMethod}
            />
          }
          icon={SHIPPING_ICONS[shippingMethod] ?? null}
          isEnabled={field.value ?? false}
          isExpanded={isExpanded}
          onEnabledChange={(checked) =>
            onEnabledChange(key, checked, field.onChange)
          }
          onToggleExpand={() => onToggleExpand(key)}
          showExpandIcon={!isFree}
        >
          {!isFree && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name={`items.${key}.price`}
                  control={control}
                  rules={{
                    validate: (value) => {
                      if (!isEnabled || !isRequiredPrice) {
                        return true;
                      }

                      return value > 0 || "Укажите стоимость доставки";
                    },
                  }}
                  render={({ field: priceField }) => (
                    <TextField
                      {...priceField}
                      value={
                        priceField.value === 0 || priceField.value == null
                          ? ""
                          : String(priceField.value)
                      }
                      onChange={(event) => {
                        onMarkUnsaved();
                        const raw = event.target.value;

                        if (raw !== "" && !/^\d+$/.test(raw)) {
                          return;
                        }

                        const cleaned = raw.replace(/^0+(\d)/, "$1");
                        priceField.onChange(
                          cleaned === "" ? 0 : Number(cleaned),
                        );
                      }}
                      type="text"
                      inputMode="numeric"
                      fullWidth
                      label="Стоимость доставки"
                      placeholder="0"
                      error={!!errors.items?.[key]?.price}
                      helperText={
                        errors.items?.[key]?.price?.message ??
                        (isRequiredPrice
                          ? "Обязательное поле для этого способа доставки"
                          : "")
                      }
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name={`items.${key}.currency`}
                  control={control}
                  rules={{
                    required: isEnabled ? "Выберите валюту" : false,
                  }}
                  render={({ field: currencyField }) => (
                    <TextField
                      {...currencyField}
                      value={currencyField.value ?? DEFAULT_CURRENCY}
                      onChange={(event) => {
                        onMarkUnsaved();
                        currencyField.onChange(event);
                      }}
                      select
                      fullWidth
                      label="Валюта"
                      error={!!errors.items?.[key]?.currency}
                      helperText={
                        errors.items?.[key]?.currency?.message ??
                        "Валюта применяется к стоимости доставки"
                      }
                    >
                      {currencies.map((currency) => (
                        <MenuItem key={currency.value} value={currency.value}>
                          {currency.description}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
            </Grid>
          )}
        </CollapsibleFormCard>
      )}
    />
  );
};
