"use client";

import React, { useCallback } from "react";
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
import { CollapsibleFormCard } from "@/shared/ui/collapsible-form-card";
import { useBatchForm } from "@/shared/hooks/useBatchForm";
import { useFormInitializer } from "@/shared/hooks/useFormInitializer";
import { Currency } from "@/shared/types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TransferFormItem {
  enabled: boolean;
  price: number;
  currency: string;
}

interface FormData {
  items: Record<string, TransferFormItem>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const SHIPPING_ICONS: Record<string, React.ReactNode> = {
  PRODUCT_PICKUP: <Store />,
  TRANSPORT_COMPANY: <LocalShipping />,
  RUSSIAN_POST: <Mail />,
  FREE_POST: <LocalShipping />,
};

// Методы без настройки цены (бесплатные)
const FREE_METHODS = new Set(["PRODUCT_PICKUP"]);

// Валюта по умолчанию
const DEFAULT_CURRENCY = "RUB";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Сравнивает существующий трансфер с данными формы.
 * Возвращает true, если данные НЕ изменились.
 */
const compareTransferData = (
  existing: Transfer,
  formData: TransferFormItem,
): boolean => {
  // Для бесплатных методов сравниваем только валюту
  if (FREE_METHODS.has(existing.sending)) {
    return existing.currency === formData.currency;
  }
  return (
    existing.price === formData.price && existing.currency === formData.currency
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const TransferFormWidget: React.FC = () => {
  const { showNotification } = useNotification();

  // ─────────────────────────────────────────────────────────────────────────
  // Data Fetching
  // ─────────────────────────────────────────────────────────────────────────

  const { data: shippingMethods, isLoading: methodsLoading } =
    useDictionary("SHOPPING_METHODS");
  const { data: currencies, isLoading: currenciesLoading } =
    useDictionary("CURRENCY");
  const { data: transfers = [], isLoading: transfersLoading } = useTransfers();

  // ─────────────────────────────────────────────────────────────────────────
  // Mutations
  // ─────────────────────────────────────────────────────────────────────────

  const createMutation = useCreateTransfer();
  const updateMutation = useUpdateTransfer();
  const deleteMutation = useDeleteTransfer();

  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  // ─────────────────────────────────────────────────────────────────────────
  // Form Setup
  // ─────────────────────────────────────────────────────────────────────────

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    getValues,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    mode: "onChange",
    defaultValues: { items: {} },
  });

  const itemsData = watch("items");

  // ─────────────────────────────────────────────────────────────────────────
  // Batch Form Logic (expanded items, compute changes)
  // ─────────────────────────────────────────────────────────────────────────

  const { toggleExpanded, isExpanded, computeChanges } = useBatchForm<
    Transfer,
    { sending: ShippingMethod; price: number; currency: Currency }
  >({
    existingItems: transfers,
    getItemKey: (item) => item.sending,
    getItemId: (item) => item.id,
    mapToCreateModel: (data, key) => ({
      sending: key as ShippingMethod,
      price: FREE_METHODS.has(key) ? 0 : data.price,
      currency: data.currency as Currency,
    }),
    compareItemData: compareTransferData,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Form Initialization (runs once when data is loaded)
  // ─────────────────────────────────────────────────────────────────────────

  // Фильтруем FREE_POST — его нельзя выбрать вручную
  const availableMethods = React.useMemo(
    () => shippingMethods?.filter((m) => m.value !== "FREE_POST") || [],
    [shippingMethods],
  );

  useFormInitializer({
    dictionaryItems: availableMethods,
    existingItems: transfers,
    isLoading: transfersLoading,
    setValue,
    getDictionaryKey: (item) => item.value,
    getExistingKey: (item) => item.sending,
    mapExistingToFormData: (item) => ({
      price: item.price,
      currency: item.currency,
    }),
    getDefaultFormData: () => ({
      price: 0,
      currency: DEFAULT_CURRENCY,
    }),
    onInitialized: (expandedKeys) => {
      // Раскрываем карточки для уже включённых методов
      expandedKeys.forEach((key) => {
        if (!isExpanded(key)) {
          toggleExpanded(key);
        }
      });
    },
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Submit Handler
  // ─────────────────────────────────────────────────────────────────────────

  const onSubmit = useCallback(
    async (data: FormData) => {
      const { toCreate, toUpdate, toDelete } = computeChanges(data.items);

      // Проверяем, есть ли что сохранять
      if (
        toCreate.length === 0 &&
        toUpdate.length === 0 &&
        toDelete.length === 0
      ) {
        return;
      }

      try {
        const operations: Promise<unknown>[] = [];

        // Создание новых записей
        toCreate.forEach((input) => {
          operations.push(createMutation.mutateAsync(input));
        });

        // Обновление существующих записей
        toUpdate.forEach(({ id, data: input }) => {
          operations.push(updateMutation.mutateAsync({ id, input }));
        });

        // Удаление отключённых записей
        toDelete.forEach((id) => {
          operations.push(deleteMutation.mutateAsync(id));
        });

        await Promise.all(operations);

        // Сбрасываем isDirty, сохраняя текущие значения как новые defaultValues
        reset(getValues(), { keepValues: true });

        showNotification("Способы доставки сохранены", "success");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Не удалось сохранить изменения";
        showNotification(message, "error");
      }
    },
    [
      computeChanges,
      createMutation,
      updateMutation,
      deleteMutation,
      showNotification,
      reset,
      getValues,
    ],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Loading State
  // ─────────────────────────────────────────────────────────────────────────

  const isLoading = transfersLoading || methodsLoading || currenciesLoading;

  if (isLoading) {
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

  // ─────────────────────────────────────────────────────────────────────────
  // Error State
  // ─────────────────────────────────────────────────────────────────────────

  if (!availableMethods.length) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        Не удалось загрузить способы доставки. Попробуйте обновить страницу.
      </Alert>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Box>
      <Alert
        severity="info"
        icon={<InfoOutlined />}
        sx={{
          mb: 3,
          borderRadius: 2,
          "& .MuiAlert-message": {
            fontSize: { xs: "0.813rem", sm: "0.875rem" },
          },
        }}
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
              color: "text.primary",
            }}
          >
            Способы доставки
          </Typography>

          <Stack spacing={2}>
            {availableMethods.map((method) => {
              const methodKey = method.value;
              const isEnabled = itemsData?.[methodKey]?.enabled ?? false;
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
                      isExpanded={isExpanded(methodKey)}
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
                                  ? "Укажите стоимость доставки"
                                  : false,
                                min: isEnabled
                                  ? { value: 0, message: "Минимум 0" }
                                  : undefined,
                              }}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  type="number"
                                  fullWidth
                                  label="Стоимость доставки"
                                  inputProps={{ min: 0, step: 1 }}
                                  error={!!errors.items?.[methodKey]?.price}
                                  helperText={
                                    errors.items?.[methodKey]?.price?.message
                                  }
                                  onChange={(e) =>
                                    field.onChange(Number(e.target.value) || 0)
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
            disabled={isMutating || !isDirty}
            sx={{ minWidth: { xs: "100%", sm: 180 } }}
            startIcon={
              isMutating ? (
                <CircularProgress size={16} color="inherit" />
              ) : undefined
            }
          >
            {isMutating ? "Сохранение..." : "Сохранить"}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};
