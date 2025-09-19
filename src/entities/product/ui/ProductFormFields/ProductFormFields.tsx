"use client";

import { Controller, Control } from "react-hook-form";
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  Grid,
} from "@mui/material";
import { CategoryModel } from "@/shared/model/types/category";
import { Currency } from "@/shared/model/types";

interface ProductFormFieldsProps {
  control: Control<any>;
  errors: any;
  categories: CategoryModel[];
  isPreorder: boolean;
  currentCurrency: Currency;
}

const currencies: { code: Currency; symbol: string }[] = [
  { code: "RUB", symbol: "₽" },
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "JPY", symbol: "¥" },
  { code: "CNY", symbol: "¥" },
];

export const ProductFormFields = ({
  control,
  errors,
  categories,
  isPreorder,
  currentCurrency,
}: ProductFormFieldsProps) => {
  const currentSymbol =
    currencies.find((c) => c.code === currentCurrency)?.symbol || "₽";

  return (
    <>
      {/* Category */}
      <Grid item xs={12}>
        <Controller
          name="categoryId"
          control={control}
          rules={{ required: "Выберите категорию товара" }}
          render={({ field }) => (
            <FormControl fullWidth error={!!errors.categoryId}>
              <InputLabel id="category-label">Категория</InputLabel>
              <Select
                labelId="category-label"
                id="categoryId"
                label="Категория"
                {...field}
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
              {errors.categoryId && (
                <FormHelperText>{errors.categoryId.message}</FormHelperText>
              )}
            </FormControl>
          )}
        />
      </Grid>

      {/* Product Name */}
      <Grid item xs={12}>
        <Controller
          name="name"
          control={control}
          rules={{
            required: "Введите название товара",
            minLength: {
              value: 3,
              message: "Минимальная длина названия 3 символа",
            },
            maxLength: {
              value: 100,
              message: "Максимальная длина названия 100 символов",
            },
          }}
          render={({ field }) => (
            <TextField
              fullWidth
              id="name"
              label="Название товара"
              placeholder="Введите название товара"
              error={!!errors.name}
              helperText={errors.name?.message}
              {...field}
            />
          )}
        />
      </Grid>

      {/* Preorder Checkbox */}
      <Grid item xs={12}>
        <Controller
          name="isPreorder"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Checkbox
                  checked={field.value}
                  onChange={field.onChange}
                  color="primary"
                />
              }
              label="Предзаказ"
            />
          )}
        />
      </Grid>

      {/* Prepayment Amount (показывается только если выбран предзаказ) */}
      {isPreorder && (
        <Grid item xs={12} sm={6}>
          <Controller
            name="prepaymentAmount"
            control={control}
            rules={{
              required: "Введите сумму предоплаты",
              pattern: {
                value: /^\d+(\.\d{1,2})?$/,
                message: "Введите корректную сумму",
              },
              validate: (value) =>
                parseFloat(value) > 0 || "Сумма должна быть больше нуля",
            }}
            render={({ field }) => (
              <TextField
                fullWidth
                id="prepaymentAmount"
                label="Сумма предоплаты"
                type="number"
                placeholder="0.00"
                error={!!errors.prepaymentAmount}
                helperText={errors.prepaymentAmount?.message}
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
      )}

      {/* Description */}
      <Grid item xs={12}>
        <Controller
          name="description"
          control={control}
          rules={{
            maxLength: {
              value: 1000,
              message: "Максимальная длина описания 1000 символов",
            },
          }}
          render={({ field }) => (
            <TextField
              fullWidth
              id="description"
              label="Описание товара"
              multiline
              rows={4}
              placeholder="Опишите ваш товар подробнее"
              error={!!errors.description}
              helperText={errors.description?.message}
              {...field}
            />
          )}
        />
      </Grid>
    </>
  );
};
