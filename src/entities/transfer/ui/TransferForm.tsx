// features/transfer/ui/ShippingMethodForm.tsx
"use client";

import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Stack,
  Typography,
  Card,
  CardContent,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  InputAdornment,
  Chip,
  Grid,
  Collapse,
  useTheme,
  useMediaQuery,
  CircularProgress,
} from "@mui/material";
import {
  LocalShipping,
  Store,
  Mail,
  CardGiftcard,
  ExpandMore,
  ExpandLess,
} from "@mui/icons-material";
import { useForm, Controller } from "react-hook-form";
import { DictionaryItem } from "@/entities/dictionary/model/types";

import { TransferCreateModel } from "@/entities/transfer/model/types";
import { useCurrencies } from "@/entities/dictionary";
import { useCreateTransfer } from "../hooks";

interface ShippingMethodFormProps {
  shippingMethods: DictionaryItem[];
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

interface FormData {
  sending: string;
  price: number;
  currency: string;
  imageId: number;
}

const getShippingIcon = (value: string) => {
  switch (value) {
    case "PRODUCT_PICKUP":
      return <Store />;
    case "TRANSPORT_COMPANY":
      return <LocalShipping />;
    case "RUSSIAN_POST":
      return <Mail />;
    case "FREE_POST":
      return <CardGiftcard />;
    default:
      return <LocalShipping />;
  }
};

export const ShippingMethodForm: React.FC<ShippingMethodFormProps> = ({
  shippingMethods,
  onSuccess,
  onError,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [expandedMethod, setExpandedMethod] = useState<string | null>(null);

  const { data: currencies, isLoading: currenciesLoading } = useCurrencies();
  const { mutateAsync: createTransfer, isPending } = useCreateTransfer();

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<FormData>({
    mode: "onChange",
    defaultValues: {
      sending: "",
      price: 0,
      currency: "RUB",
      imageId: 1, // Временное значение, нужно будет получать из контекста или пропсов
    },
  });

  const selectedMethod = watch("sending");
  const selectedPrice = watch("price");

  const handleMethodClick = (value: string) => {
    setExpandedMethod(expandedMethod === value ? null : value);
  };

  const onSubmit = async (data: FormData) => {
    try {
      const transferData: TransferCreateModel = {
        sending: data.sending as any,
        price: data.price,
        currency: data.currency as any,
        imageId: data.imageId,
      };

      await createTransfer(transferData);
      onSuccess?.();
    } catch (error) {
      onError?.("Не удалось сохранить способ отправки. Попробуйте снова.");
    }
  };

  if (currenciesLoading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      <FormControl component="fieldset" fullWidth>
        <FormLabel
          component="legend"
          sx={{
            mb: 2,
            fontSize: { xs: "1rem", sm: "1.125rem" },
            fontWeight: 600,
            color: "text.primary",
          }}
        >
          Выберите способ доставки
        </FormLabel>

        <Controller
          name="sending"
          control={control}
          rules={{ required: "Выберите способ доставки" }}
          render={({ field }) => (
            <RadioGroup {...field}>
              <Stack spacing={2}>
                {shippingMethods.map((method) => {
                  const isExpanded = expandedMethod === method.value;
                  const isSelected = selectedMethod === method.value;

                  return (
                    <Card
                      key={method.value}
                      sx={{
                        cursor: "pointer",
                        transition: "all 0.2s",
                        border: `2px solid ${
                          isSelected
                            ? theme.palette.primary.main
                            : theme.palette.divider
                        }`,
                        boxShadow: isSelected
                          ? `0 0 0 1px ${theme.palette.primary.main}`
                          : "none",
                        "&:hover": {
                          borderColor: theme.palette.primary.light,
                          boxShadow: `0 2px 8px ${theme.palette.action.hover}`,
                        },
                      }}
                    >
                      <CardContent
                        sx={{
                          p: { xs: 2, sm: 2.5 },
                          "&:last-child": { pb: { xs: 2, sm: 2.5 } },
                        }}
                      >
                        <Box
                          display="flex"
                          alignItems="center"
                          justifyContent="space-between"
                          onClick={() => {
                            field.onChange(method.value);
                            handleMethodClick(method.value);
                          }}
                        >
                          <Box
                            display="flex"
                            alignItems="center"
                            gap={2}
                            flex={1}
                          >
                            <FormControlLabel
                              value={method.value}
                              control={<Radio />}
                              label=""
                              sx={{ m: 0 }}
                            />
                            <Box
                              sx={{
                                color: isSelected
                                  ? "primary.main"
                                  : "action.active",
                                display: { xs: "none", sm: "flex" },
                              }}
                            >
                              {getShippingIcon(method.value)}
                            </Box>
                            <Box flex={1}>
                              <Typography
                                variant="body1"
                                fontWeight={isSelected ? 600 : 500}
                                sx={{
                                  fontSize: { xs: "0.875rem", sm: "1rem" },
                                }}
                              >
                                {method.description}
                              </Typography>
                              {method.value === "FREE_POST" && (
                                <Chip
                                  label="Бесплатно"
                                  size="small"
                                  color="success"
                                  sx={{
                                    mt: 0.5,
                                    height: 20,
                                    fontSize: "0.7rem",
                                  }}
                                />
                              )}
                            </Box>
                          </Box>
                          {isSelected && (
                            <Box sx={{ ml: 1 }}>
                              {isExpanded ? <ExpandLess /> : <ExpandMore />}
                            </Box>
                          )}
                        </Box>

                        <Collapse in={isSelected && isExpanded} timeout="auto">
                          <Box sx={{ mt: 3, pl: { xs: 0, sm: 7 } }}>
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={8}>
                                <Controller
                                  name="price"
                                  control={control}
                                  rules={{
                                    required: "Укажите стоимость доставки",
                                    min: {
                                      value: 0,
                                      message:
                                        "Стоимость не может быть отрицательной",
                                    },
                                  }}
                                  render={({
                                    field: { onChange, value, ...field },
                                  }) => (
                                    <TextField
                                      {...field}
                                      value={value || ""}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (
                                          val === "" ||
                                          /^\d*\.?\d*$/.test(val)
                                        ) {
                                          onChange(
                                            val === "" ? 0 : parseFloat(val)
                                          );
                                        }
                                      }}
                                      fullWidth
                                      label="Стоимость доставки"
                                      placeholder="0"
                                      error={!!errors.price}
                                      helperText={errors.price?.message}
                                      size={isMobile ? "small" : "medium"}
                                      InputProps={{
                                        endAdornment: (
                                          <InputAdornment position="end">
                                            ₽
                                          </InputAdornment>
                                        ),
                                      }}
                                      inputProps={{
                                        inputMode: "decimal",
                                      }}
                                    />
                                  )}
                                />
                              </Grid>

                              <Grid item xs={12} sm={4}>
                                <Controller
                                  name="currency"
                                  control={control}
                                  render={({ field }) => (
                                    <TextField
                                      {...field}
                                      select
                                      fullWidth
                                      label="Валюта"
                                      size={isMobile ? "small" : "medium"}
                                      SelectProps={{
                                        native: true,
                                      }}
                                    >
                                      {currencies?.map((currency) => (
                                        <option
                                          key={currency.value}
                                          value={currency.value}
                                        >
                                          {currency.description}
                                        </option>
                                      ))}
                                    </TextField>
                                  )}
                                />
                              </Grid>
                            </Grid>

                            {method.value === "FREE_POST" && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ mt: 2, display: "block" }}
                              >
                                Бесплатная доставка будет применена
                                автоматически при достижении определенной суммы
                                заказа
                              </Typography>
                            )}
                          </Box>
                        </Collapse>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            </RadioGroup>
          )}
        />

        {errors.sending && (
          <Typography color="error" variant="caption" sx={{ mt: 1, ml: 2 }}>
            {errors.sending.message}
          </Typography>
        )}
      </FormControl>

      {selectedMethod && (
        <Box
          sx={{
            mt: 3,
            p: 2,
            bgcolor: "action.hover",
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Итоговая стоимость доставки:
          </Typography>
          <Typography variant="h5" color="primary" fontWeight={700}>
            {selectedPrice > 0 ? `${selectedPrice} ₽` : "Бесплатно"}
          </Typography>
        </Box>
      )}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mt: 4 }}
        justifyContent="flex-end"
      >
        <Button
          variant="outlined"
          size="large"
          disabled={isPending}
          sx={{ order: { xs: 2, sm: 1 } }}
        >
          Отмена
        </Button>
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={isPending || !isValid || !selectedMethod}
          sx={{
            order: { xs: 1, sm: 2 },
            minWidth: { xs: "100%", sm: 180 },
          }}
          startIcon={isPending ? <CircularProgress size={16} /> : undefined}
        >
          {isPending ? "Сохранение..." : "Сохранить"}
        </Button>
      </Stack>
    </Box>
  );
};
