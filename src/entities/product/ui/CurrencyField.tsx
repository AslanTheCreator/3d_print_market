"use client";

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

export const CurrencyField = ({
  control,
  priceError,
  currencyError,
  currentCurrency,
}: CurrencyFieldProps) => {
  const currentSymbol = getCurrencySymbol(currentCurrency);

  return (
    <>
      <Grid item xs={12} sm={6}>
        <Controller
          name="price"
          control={control}
          rules={productPriceRules}
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
          rules={productCurrencyRules}
          render={({ field }) => (
            <FormControl fullWidth error={!!currencyError}>
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
