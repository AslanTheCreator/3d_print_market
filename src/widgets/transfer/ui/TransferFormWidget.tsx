"use client";

import React, { useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  Stack,
  Typography,
  FormControl,
  MenuItem,
  Grid,
  CircularProgress,
  Alert,
} from "@mui/material";
import { LocalShipping, Store, Mail, InfoOutlined } from "@mui/icons-material";
import { useForm, Controller } from "react-hook-form";
import {
  useTransfers,
  useCreateTransfer,
  useUpdateTransfer,
  useDeleteTransfer,
  type ShippingMethod,
  type Transfer,
} from "@/entities/transfer";
import { useDictionary } from "@/entities/dictionary";
import { useNotification } from "@/app/providers";
import { CollapsibleFormCard } from "@/shared/ui/collapsible-form-card/CollapsibleFormCard";
import { Currency } from "@/shared/types";

// Тип данных для одного метода доставки в форме
interface TransferFormItem {
  enabled: boolean;
  price: number;
  currency: string;
}

// Тип всей формы
interface TransferFormData {
  items: Record<string, TransferFormItem>;
}

// Иконки для методов доставки
const SHIPPING_ICONS: Record<string, React.ReactNode> = {
  PRODUCT_PICKUP: <Store />,
  TRANSPORT_COMPANY: <LocalShipping />,
  RUSSIAN_POST: <Mail />,
  FREE_POST: <LocalShipping />,
};

// Методы без настройки цены (бесплатные)
const FREE_METHODS = new Set(["PRODUCT_PICKUP"]);

export const TransferFormWidget: React.FC = () => {
  // Data fetching
  const { data: shippingMethods, isLoading: methodsLoading } =
    useDictionary("SHOPPING_METHODS");
  const { data: currencies, isLoading: currenciesLoading } =
    useDictionary("CURRENCY");
  const { data: transfers = [], isLoading: transfersLoading } = useTransfers();

  // Mutations
  const createMutation = useCreateTransfer();
  const updateMutation = useUpdateTransfer();
  const deleteMutation = useDeleteTransfer();

  const { showNotification } = useNotification();

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  // Фильтруем FREE_POST — его нельзя выбрать вручную
  const availableMethods = React.useMemo(
    () => shippingMethods?.filter((m) => m.value !== "FREE_POST") || [],
    [shippingMethods],
  );

  // Маппинг существующих трансферов по методу
  const transfersByMethod = React.useMemo(() => {
    return transfers.reduce<Record<string, Transfer>>((acc, t) => {
      acc[t.sending] = t;
      return acc;
    }, {});
  }, [transfers]);

  // Form setup
  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<TransferFormData>({
    mode: "onChange",
    defaultValues: { items: {} },
  });

  // Состояние раскрытых карточек
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(
    new Set(),
  );

  const toggleExpanded = React.useCallback((key: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Инициализация формы при загрузке данных
  useEffect(() => {
    if (!availableMethods.length || transfersLoading) return;

    const formData: Record<string, TransferFormItem> = {};
    const expanded = new Set<string>();

    availableMethods.forEach((method) => {
      const existing = transfersByMethod[method.value];

      if (existing) {
        formData[method.value] = {
          enabled: true,
          price: existing.price,
          currency: existing.currency,
        };
        expanded.add(method.value);
      } else {
        formData[method.value] = {
          enabled: false,
          price: 0,
          currency: "RUB",
        };
      }
    });

    reset({ items: formData }, { keepDirty: false });
    setExpandedItems(expanded);
  }, [availableMethods, transfersByMethod, transfersLoading, reset]);

  const itemsData = watch("items");

  // Сохранение формы
  const onSubmit = async (data: TransferFormData) => {
    const operations: Promise<void>[] = [];

    for (const [method, formItem] of Object.entries(data.items)) {
      const existing = transfersByMethod[method];
      const isFreeMethod = FREE_METHODS.has(method);

      const input = {
        sending: method as ShippingMethod,
        price: isFreeMethod ? 0 : formItem.price,
        currency: formItem.currency as Currency,
      };

      if (formItem.enabled) {
        if (existing) {
          // Обновляем только если есть изменения
          const hasChanges =
            existing.price !== input.price ||
            existing.currency !== input.currency;

          if (hasChanges) {
            operations.push(
              updateMutation
                .mutateAsync({ id: existing.id, input })
                .then(() => {}),
            );
          }
        } else {
          // Создаём новый
          operations.push(createMutation.mutateAsync(input).then(() => {}));
        }
      } else if (existing) {
        // Удаляем выключенный
        operations.push(deleteMutation.mutateAsync(existing.id));
      }
    }

    if (operations.length === 0) {
      return;
    }

    try {
      await Promise.all(operations);
      showNotification("Способы доставки сохранены", "success");
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "Не удалось сохранить изменения";
      showNotification(msg, "error");
    }
  };

  // Loading state
  if (transfersLoading || methodsLoading || currenciesLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={200}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (!availableMethods.length) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        Не удалось загрузить способы доставки. Попробуйте обновить страницу.
      </Alert>
    );
  }

  return (
    <Box>
      <Alert
        severity="info"
        icon={<InfoOutlined />}
        sx={{ mb: 3, borderRadius: 2 }}
      >
        Выберите способы отправки товара и укажите стоимость доставки.
      </Alert>

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <FormControl component="fieldset" fullWidth>
          <Typography
            component="legend"
            sx={{
              mb: 2,
              fontSize: { xs: "1rem", sm: "1.125rem" },
              fontWeight: 600,
            }}
          >
            Способы доставки
          </Typography>

          <Stack spacing={2}>
            {availableMethods.map((method) => {
              const methodKey = method.value;
              const isEnabled = itemsData?.[methodKey]?.enabled ?? false;
              const isExpanded = expandedItems.has(methodKey);
              const isFreeMethod = FREE_METHODS.has(methodKey);

              return (
                <Controller
                  key={methodKey}
                  name={`items.${methodKey}.enabled`}
                  control={control}
                  render={({ field }) => (
                    <CollapsibleFormCard
                      value={methodKey}
                      label={method.description}
                      icon={SHIPPING_ICONS[methodKey]}
                      isEnabled={field.value ?? false}
                      isExpanded={isExpanded}
                      onEnabledChange={field.onChange}
                      onToggleExpand={() => toggleExpanded(methodKey)}
                      showExpandIcon={!isFreeMethod}
                    >
                      {!isFreeMethod && (
                        <Grid container spacing={2}>
                          {/* Цена */}
                          <Grid item xs={12} sm={6}>
                            <Controller
                              name={`items.${methodKey}.price`}
                              control={control}
                              rules={{
                                required: isEnabled
                                  ? "Укажите стоимость"
                                  : false,
                                min: { value: 0, message: "Минимум 0" },
                              }}
                              render={({
                                field: { onChange, value, ...field },
                              }) => (
                                <TextField
                                  {...field}
                                  value={value ?? ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === "" || /^\d*\.?\d*$/.test(val)) {
                                      onChange(
                                        val === "" ? 0 : parseFloat(val),
                                      );
                                    }
                                  }}
                                  fullWidth
                                  label="Стоимость доставки"
                                  type="text"
                                  inputMode="decimal"
                                  error={!!errors.items?.[methodKey]?.price}
                                  helperText={
                                    errors.items?.[methodKey]?.price?.message
                                  }
                                />
                              )}
                            />
                          </Grid>

                          {/* Валюта */}
                          <Grid item xs={12} sm={6}>
                            <Controller
                              name={`items.${methodKey}.currency`}
                              control={control}
                              rules={{
                                required: isEnabled ? "Выберите валюту" : false,
                              }}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  select
                                  fullWidth
                                  label="Валюта"
                                  error={!!errors.items?.[methodKey]?.currency}
                                  helperText={
                                    errors.items?.[methodKey]?.currency?.message
                                  }
                                >
                                  {currencies?.map((c) => (
                                    <MenuItem key={c.value} value={c.value}>
                                      {c.description}
                                    </MenuItem>
                                  ))}
                                </TextField>
                              )}
                            />
                          </Grid>
                        </Grid>
                      )}
                    </CollapsibleFormCard>
                  )}
                />
              );
            })}
          </Stack>
        </FormControl>

        <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end" }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={isPending || !isDirty}
            sx={{ minWidth: { xs: "100%", sm: 180 } }}
            startIcon={
              isPending ? (
                <CircularProgress size={16} color="inherit" />
              ) : undefined
            }
          >
            {isPending ? "Сохранение..." : "Сохранить"}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};
