"use client";

import { useState } from "react";
import { Controller, Control, FieldError } from "react-hook-form";
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  InputAdornment,
  Grid,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  getCurrencySymbol,
  productCurrencies,
  productCurrencyRules,
  productPriceRules,
  type ProductFormData,
} from "../model/form";
import { Currency } from "@/shared/types";

interface CurrencyFieldProps {
  control: Control<ProductFormData>;
  priceError?: FieldError;
  currencyError?: FieldError;
  currentCurrency: Currency;
}

type FocusField = "price" | "currency";

export const CurrencyField = ({
  control,
  priceError,
  currencyError,
  currentCurrency,
}: CurrencyFieldProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const currentSymbol = getCurrencySymbol(currentCurrency);
  const [focusedField, setFocusedField] = useState<FocusField | null>(null);

  const getHelperText = (
    field: FocusField,
    errorMessage: string | undefined,
    defaultMessage: string,
  ) => {
    if (errorMessage) {
      return errorMessage;
    }

    if (!isMobile || focusedField === field) {
      return defaultMessage;
    }

    return undefined;
  };

  return (
    <>
      <Grid item xs={12} sm={6}>
        <Controller
          name="price"
          control={control}
          rules={productPriceRules}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              id="price"
              label="Цена продажи"
              type="text"
              placeholder="Например: 1490"
              error={!!priceError}
              helperText={getHelperText(
                "price",
                priceError?.message,
                "Итоговая цена за одну единицу.",
              )}
              onFocus={() => setFocusedField("price")}
              onBlur={(event) => {
                field.onBlur();
                setFocusedField((prev) => (prev === "price" ? null : prev));
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {currentSymbol}
                  </InputAdornment>
                ),
                inputProps: {
                  inputMode: "decimal",
                },
              }}
            />
          )}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <Controller
          name="currency"
          control={control}
          rules={productCurrencyRules}
          render={({ field }) => (
            <FormControl
              fullWidth
              error={!!currencyError}
              onFocus={() => setFocusedField("currency")}
              onBlur={() => setFocusedField((prev) => (prev === "currency" ? null : prev))}
            >
              <InputLabel id="currency-label">Валюта</InputLabel>
              <Select
                labelId="currency-label"
                id="currency"
                label="Валюта"
                {...field}
              >
                {productCurrencies.map((currency) => (
                  <MenuItem key={currency.code} value={currency.code}>
                    {currency.code} ({currency.symbol})
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {getHelperText(
                  "currency",
                  currencyError?.message,
                  "В этой валюте покупатель увидит цену.",
                )}
              </FormHelperText>
            </FormControl>
          )}
        />
      </Grid>
    </>
  );
};
