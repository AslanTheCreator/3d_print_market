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
import { Inventory } from "@mui/icons-material";
import { CategoryModel } from "@/shared/types";
import { Currency } from "@/shared/types";
import {
  getCurrencySymbol,
  productCategoryRules,
  productCountRules,
  productDescriptionRules,
  productNameRules,
  productPrepaymentRules,
  type ProductFormData,
} from "../model/form";

interface ProductFormFieldsProps {
  control: Control<ProductFormData>;
  errors: FieldErrors<ProductFormData>;
  categories: CategoryModel[];
  isPreorder: boolean;
  currentCurrency: Currency;
}

export const ProductFormFields = ({
  control,
  errors,
  categories,
  isPreorder,
  currentCurrency,
}: ProductFormFieldsProps) => {
  const currentSymbol = getCurrencySymbol(currentCurrency);

  return (
    <>
      {/* Multiple Category Selection */}
      <Grid item xs={12}>
        <Controller
          name="categoryIds"
          control={control}
          rules={productCategoryRules}
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
                        (cat) => cat.id === categoryId,
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
          rules={productNameRules}
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

      {/* Product Count */}
      <Grid item xs={12} sm={6}>
        <Controller
          name="count"
          control={control}
          rules={productCountRules}
          render={({ field }) => (
            <TextField
              fullWidth
              id="count"
              label="Количество товара"
              type="number"
              placeholder="Введите количество"
              error={!!errors.count}
              helperText={
                errors.count?.message ||
                "Укажите количество доступных единиц товара"
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Inventory />
                  </InputAdornment>
                ),
                inputProps: {
                  min: 1,
                  max: 999999,
                  step: 1,
                },
              }}
              {...field}
            />
          )}
        />
      </Grid>

      {/* Preorder Checkbox */}
      <Grid item xs={12} sm={6} sx={{ display: "flex", alignItems: "center" }}>
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
            rules={productPrepaymentRules}
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
          rules={productDescriptionRules}
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
