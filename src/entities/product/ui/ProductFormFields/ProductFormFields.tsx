"use client";

import { Controller, Control, FieldErrors } from "react-hook-form";
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
  Chip,
  Box,
  OutlinedInput,
} from "@mui/material";
import { CategoryModel } from "@/entities/category/model/types";
import { Currency } from "@/shared/types";
import { ProductFormData } from "@/entities/product/model/form";

interface ProductFormFieldsProps {
  control: Control<ProductFormData>;
  errors: FieldErrors<ProductFormData>;
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
      {/* Multiple Category Selection */}
      <Grid item xs={12}>
        <Controller
          name="categoryIds"
          control={control}
          rules={{
            required: "Выберите хотя бы одну категорию",
            validate: (value) =>
              value.length > 0 || "Необходимо выбрать хотя бы одну категорию",
          }}
          render={({ field }) => (
            <FormControl fullWidth error={!!errors.categoryIds}>
              <InputLabel id="category-label">Категории</InputLabel>
              <Select
                labelId="category-label"
                id="categoryIds"
                multiple
                label="Категории"
                value={field.value}
                onChange={field.onChange}
                input={<OutlinedInput label="Категории" />}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((categoryId) => {
                      const category = categories.find(
                        (cat) => cat.id === categoryId
                      );
                      return (
                        <Chip
                          key={categoryId}
                          label={category?.name || categoryId}
                          size="small"
                        />
                      );
                    })}
                  </Box>
                )}
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    <Checkbox checked={field.value.indexOf(category.id) > -1} />
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
              {errors.categoryIds && (
                <FormHelperText>{errors.categoryIds.message}</FormHelperText>
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
