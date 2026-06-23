import type React from "react";
import {
  Box,
  FormControl,
  FormHelperText,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { Controller, type Control, type FieldErrors } from "react-hook-form";
import {
  productCountRules,
  productCurrencies,
  productCurrencyRules,
  productPrepaymentRules,
  productPriceRules,
  type ProductFormData,
} from "@/entities/product";
import type { Currency } from "@/shared/types";
import { getReadableCurrencySymbol } from "./productFormHelpers";

interface ProductSaleFieldsProps {
  control: Control<ProductFormData>;
  currentCurrency: Currency;
  errors: FieldErrors<ProductFormData>;
  isPreorder: boolean;
}

export const ProductSaleFields = ({
  control,
  currentCurrency,
  errors,
  isPreorder,
}: ProductSaleFieldsProps): React.ReactElement => {
  const currentSymbol = getReadableCurrencySymbol(currentCurrency);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "minmax(0, 1fr)",
          md: "repeat(3, minmax(0, 1fr))",
        },
        gap: 2,
      }}
    >
      <Box sx={{ minWidth: 0, gridColumn: "1 / -1" }}>
        <Controller
          name="isPreorder"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth>
              <Typography variant="body2" fontWeight={700} sx={{ mb: 0.75 }}>
                Доступность
              </Typography>
              <ToggleButtonGroup
                exclusive
                value={field.value ? "preorder" : "available"}
                onChange={(_, value: string | null) => {
                  if (!value) {
                    return;
                  }

                  field.onChange(value === "preorder");
                }}
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                  gap: 1,
                  "& .MuiToggleButton-root": {
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1.5,
                    py: 1,
                    fontWeight: 800,
                    textTransform: "none",
                    "&.Mui-selected": {
                      borderColor: "primary.main",
                      color: "primary.main",
                      bgcolor: "primary.50",
                    },
                  },
                }}
              >
                <ToggleButton value="available">В наличии</ToggleButton>
                <ToggleButton value="preorder">Предзаказ</ToggleButton>
              </ToggleButtonGroup>
            </FormControl>
          )}
        />
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Controller
          name="price"
          control={control}
          rules={productPriceRules}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              required
              id="price"
              label="Цена"
              placeholder="1490"
              error={!!errors.price}
              helperText={errors.price?.message ?? "Цена за одну единицу."}
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
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Controller
          name="currency"
          control={control}
          rules={productCurrencyRules}
          render={({ field }) => (
            <FormControl fullWidth required error={!!errors.currency}>
              <InputLabel id="currency-label">Валюта</InputLabel>
              <Select
                labelId="currency-label"
                id="currency"
                label="Валюта"
                {...field}
              >
                {productCurrencies.map((currency) => (
                  <MenuItem key={currency.code} value={currency.code}>
                    {currency.code} ({getReadableCurrencySymbol(currency.code)})
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {errors.currency?.message ?? "Валюта цены товара."}
              </FormHelperText>
            </FormControl>
          )}
        />
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Controller
          name="count"
          control={control}
          rules={productCountRules}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              required
              id="count"
              label="Количество"
              placeholder="1"
              error={!!errors.count}
              helperText={
                errors.count?.message ?? "Сколько единиц доступно."
              }
              inputProps={{ inputMode: "numeric" }}
            />
          )}
        />
      </Box>

      {isPreorder && (
        <Box sx={{ minWidth: 0 }}>
          <Controller
            name="prepaymentAmount"
            control={control}
            rules={productPrepaymentRules}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                required
                id="prepaymentAmount"
                label="Предоплата"
                placeholder="500"
                error={!!errors.prepaymentAmount}
                helperText={
                  errors.prepaymentAmount?.message ??
                  "Сумма, которую покупатель платит сразу."
                }
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
        </Box>
      )}
    </Box>
  );
};
