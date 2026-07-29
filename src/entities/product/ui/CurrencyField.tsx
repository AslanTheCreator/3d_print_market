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
              {...field}
              fullWidth
              id="price"
              label="Цена продажи"
              type="text"
              placeholder="Например: 1490"
              error={!!priceError}
              helperText={
                priceError?.message ?? "Итоговая цена за одну единицу."
              }
              FormHelperTextProps={{
                sx: {
                  display: priceError
                    ? "block"
                    : { xs: "none", sm: "block" },
                },
              }}
              sx={{
                "&:focus-within .MuiFormHelperText-root": {
                  display: "block",
                },
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
              sx={{
                "& .MuiFormHelperText-root": {
                  display: currencyError
                    ? "block"
                    : { xs: "none", sm: "block" },
                },
                "&:focus-within .MuiFormHelperText-root": {
                  display: "block",
                },
              }}
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
                {currencyError?.message ??
                  "В этой валюте покупатель увидит цену."}
              </FormHelperText>
            </FormControl>
          )}
        />
      </Grid>
    </>
  );
};
