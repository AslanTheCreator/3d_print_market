import React from "react";
import {
  Box,
  TextField,
  Button,
  Grid,
  Typography,
  Stack,
  CircularProgress,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import {
  AddressInput,
  DEFAULT_COUNTRY,
  ADDRESS_VALIDATION,
} from "../model/types";

interface AddressFormProps {
  onSubmit: (data: AddressInput) => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: Partial<AddressInput>;
  submitButtonText?: string;
  title?: string;
}

export const AddressForm: React.FC<AddressFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false,
  initialData,
  submitButtonText = "Сохранить адрес",
  title = "Новый адрес",
}) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    reset,
  } = useForm<AddressInput>({
    mode: "onChange",
    defaultValues: {
      country: initialData?.country || DEFAULT_COUNTRY,
      city: initialData?.city || "",
      street: initialData?.street || "",
      houseNumber: initialData?.houseNumber || "",
      apartmentNumber: initialData?.apartmentNumber || "",
      index: initialData?.index || 0,
    },
  });

  const handleFormSubmit = async (data: AddressInput) => {
    try {
      await onSubmit(data);
      reset();
    } catch (error) {
      console.error("Ошибка при сохранении адреса:", error);
    }
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  return (
    <Box component="form" onSubmit={handleSubmit(handleFormSubmit)}>
      {title && (
        <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
          {title}
        </Typography>
      )}

      <Grid container spacing={2}>
        {/* Страна */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="country"
            control={control}
            rules={{
              required: "Введите страну",
              minLength: {
                value: ADDRESS_VALIDATION.COUNTRY_MIN_LENGTH,
                message: `Страна должна содержать минимум ${ADDRESS_VALIDATION.COUNTRY_MIN_LENGTH} символа`,
              },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Страна"
                error={!!errors.country}
                helperText={errors.country?.message}
                disabled={isLoading}
                size="medium"
              />
            )}
          />
        </Grid>

        {/* Город */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="city"
            control={control}
            rules={{
              required: "Введите город",
              minLength: {
                value: ADDRESS_VALIDATION.CITY_MIN_LENGTH,
                message: `Город должен содержать минимум ${ADDRESS_VALIDATION.CITY_MIN_LENGTH} символа`,
              },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Город"
                error={!!errors.city}
                helperText={errors.city?.message}
                disabled={isLoading}
                size="medium"
              />
            )}
          />
        </Grid>

        {/* Улица */}
        <Grid item xs={12}>
          <Controller
            name="street"
            control={control}
            rules={{
              required: "Введите улицу",
              minLength: {
                value: ADDRESS_VALIDATION.STREET_MIN_LENGTH,
                message: `Улица должна содержать минимум ${ADDRESS_VALIDATION.STREET_MIN_LENGTH} символа`,
              },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Улица"
                placeholder="Например: ул. Ленина"
                error={!!errors.street}
                helperText={errors.street?.message}
                disabled={isLoading}
                size="medium"
              />
            )}
          />
        </Grid>

        {/* Номер дома */}
        <Grid item xs={12} sm={4}>
          <Controller
            name="houseNumber"
            control={control}
            rules={{
              required: "Введите номер дома",
              pattern: {
                value: /^[0-9а-яёa-z\s\-\/]+$/i,
                message: "Некорректный формат номера дома",
              },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Номер дома"
                placeholder="12А"
                error={!!errors.houseNumber}
                helperText={errors.houseNumber?.message}
                disabled={isLoading}
                size="medium"
              />
            )}
          />
        </Grid>

        {/* Номер квартиры */}
        <Grid item xs={12} sm={4}>
          <Controller
            name="apartmentNumber"
            control={control}
            rules={{
              pattern: {
                value: /^[0-9а-яёa-z\s\-\/]*$/i,
                message: "Некорректный формат квартиры",
              },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Номер квартиры"
                placeholder="45 (необязательно)"
                error={!!errors.apartmentNumber}
                helperText={errors.apartmentNumber?.message}
                disabled={isLoading}
                size="medium"
              />
            )}
          />
        </Grid>

        {/* Почтовый индекс */}
        <Grid item xs={12} sm={4}>
          <Controller
            name="index"
            control={control}
            rules={{
              required: "Введите почтовый индекс",
              min: {
                value: ADDRESS_VALIDATION.INDEX_MIN,
                message: `Индекс должен содержать ${ADDRESS_VALIDATION.INDEX_LENGTH} цифр`,
              },
              max: {
                value: ADDRESS_VALIDATION.INDEX_MAX,
                message: `Индекс должен содержать ${ADDRESS_VALIDATION.INDEX_LENGTH} цифр`,
              },
            }}
            render={({ field: { onChange, value, ...field } }) => (
              <TextField
                {...field}
                value={value || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || /^\d{0,6}$/.test(val)) {
                    onChange(val === "" ? 0 : parseInt(val, 10));
                  }
                }}
                fullWidth
                label="Почтовый индекс"
                placeholder="123456"
                error={!!errors.index}
                helperText={errors.index?.message}
                disabled={isLoading}
                size="medium"
                inputProps={{
                  maxLength: ADDRESS_VALIDATION.INDEX_LENGTH,
                  pattern: "[0-9]*",
                  inputMode: "numeric",
                }}
              />
            )}
          />
        </Grid>
      </Grid>

      {/* Кнопки */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mt: 4 }}
        justifyContent="flex-end"
      >
        <Button
          variant="outlined"
          onClick={handleCancel}
          disabled={isLoading}
          size="large"
          sx={{ order: { xs: 2, sm: 1 } }}
        >
          Отмена
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={isLoading || !isValid || !isDirty}
          size="large"
          sx={{
            order: { xs: 1, sm: 2 },
            minWidth: { xs: "100%", sm: "auto" },
          }}
          startIcon={isLoading ? <CircularProgress size={16} /> : undefined}
        >
          {isLoading ? "Сохранение..." : submitButtonText}
        </Button>
      </Stack>
    </Box>
  );
};
