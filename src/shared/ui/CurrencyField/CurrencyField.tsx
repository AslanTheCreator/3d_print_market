"use client";

import { Controller, Control } from "react-hook-form";
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  InputAdornment,
  Grid,
} from "@mui/material";
import { Currency } from "@/shared/model/types";

const currencies: { code: Currency; symbol: string }[] = [
  { code: "RUB", symbol: "₽" },
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "JPY", symbol: "¥" },
  { code: "CNY", symbol: "¥" },
];

interface CurrencyFieldProps {
  control: Control<any>;
  priceError?: any;
  currencyError?: any;
  currentCurrency: Currency;
}

export const CurrencyField = ({
  control,
  priceError,
  currencyError,
  currentCurrency,
}: CurrencyFieldProps) => {
  const currentSymbol =
    currencies.find((c) => c.code === currentCurrency)?.symbol || "₽";

  return (
    <>
      <Grid item xs={12} sm={6}>
        <Controller
          name="price"
          control={control}
          rules={{
            required: "Введите цену товара",
            pattern: {
              value: /^\d+(\.\d{1,2})?$/,
              message: "Введите корректную цену",
            },
            validate: (value) =>
              parseFloat(value) > 0 || "Цена должна быть больше нуля",
          }}
          render={({ field }) => (
            <TextField
              fullWidth
              id="price"
              label="Цена"
              type="number"
              placeholder="0.00"
              error={!!priceError}
              helperText={priceError?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {currentSymbol}
                  </InputAdornment>
                ),
              }}
              {...field}
            />
          )}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <Controller
          name="currency"
          control={control}
          rules={{ required: "Выберите валюту" }}
          render={({ field }) => (
            <FormControl fullWidth error={!!currencyError}>
              <InputLabel id="currency-label">Валюта</InputLabel>
              <Select
                labelId="currency-label"
                id="currency"
                label="Валюта"
                {...field}
              >
                {currencies.map((currency) => (
                  <MenuItem key={currency.code} value={currency.code}>
                    {currency.code} ({currency.symbol})
                  </MenuItem>
                ))}
              </Select>
              {currencyError && (
                <FormHelperText>{currencyError.message}</FormHelperText>
              )}
            </FormControl>
          )}
        />
      </Grid>
    </>
  );
};
