"use client";

import React from "react";
import {
  Box,
  TextField,
  Button,
  Stack,
  Typography,
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
import { Currency } from "@/shared/types";
import { useBatchForm } from "@/shared/hooks/useBatchForm";
import { useFormInitializer } from "@/shared/hooks/useFormInitializer";

// Типы
interface TransferFormItem {
  enabled: boolean;
  price: number;
  currency: string;
}

interface FormData {
  items: Record<string, TransferFormItem>;
}

// Константы
const SHIPPING_ICONS: Record<string, React.ReactNode> = {
  PRODUCT_PICKUP: <Store />,
  TRANSPORT_COMPANY: <LocalShipping />,
  RUSSIAN_POST: <Mail />,
  FREE_POST: <LocalShipping />,
};

const FREE_METHODS = new Set(["PRODUCT_PICKUP"]);
const DEFAULT_CURRENCY = "RUB";

// Функция сравнения для определения изменений
const compareTransferData = (
  existing: Transfer,
  formData: TransferFormItem,
): boolean => {
  return (
    existing.price === formData.price && existing.currency === formData.currency
  );
};

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

  // Form setup
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    mode: "onChange",
    defaultValues: { items: {} },
  });

  // Batch form helpers
  const { toggleExpanded, isExpanded, computeChanges } = useBatchForm<
    Transfer,
    { sending: ShippingMethod; price: number; currency: Currency }
  >({
    existingItems: transfers,
    getItemKey: (item) => item.sending,
    mapToCreateModel: (data, key) => ({
      sending: key as ShippingMethod,
      price: FREE_METHODS.has(key) ? 0 : data.price,
      currency: data.currency as Currency,
    }),
    getItemId: (item) => item.id,
    compareItemData: compareTransferData,
  });

  // Form initializer
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
    onInitialized: (expanded) => {
      expanded.forEach((key) => toggleExpanded(key));
    },
  });

  const itemsData = watch("items");

  // Сохранение формы
  const onSubmit = async (data: FormData) => {
    const { toCreate, toDelete, toUpdate } = computeChanges(data.items);

    const operations: Promise<void>[] = [];

    // Создаём новые
    toCreate.forEach((input) => {
      operations.push(createMutation.mutateAsync(input).then(() => {}));
    });

    // Удаляем отключённые
    toDelete.forEach((id) => {
      operations.push(deleteMutation.mutateAsync(id));
    });

    // Обновляем изменённые
    toUpdate.forEach(({ id, data: input }) => {
      operations.push(updateMutation.mutateAsync({ id, input }).then(() => {}));
    });

    if (operations.length === 0) {
      showNotification("Ничего не изменилось", "info");
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

  if (!currencies?.length) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        Не удалось загрузить список валют. Попробуйте обновить страницу.
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
        <Typography
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
                              required: isEnabled ? "Укажите стоимость" : false,
                              min: { value: 0, message: "Минимум 0" },
                            }}
                            render={({ field: priceField }) => (
                              <TextField
                                fullWidth
                                label="Стоимость доставки"
                                type="text"
                                inputMode="decimal"
                                value={priceField.value ?? 0}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === "" || /^\d*\.?\d*$/.test(val)) {
                                    priceField.onChange(
                                      val === "" ? 0 : parseFloat(val),
                                    );
                                  }
                                }}
                                onBlur={priceField.onBlur}
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
                            render={({ field: currencyField }) => (
                              <TextField
                                select
                                fullWidth
                                label="Валюта"
                                value={currencyField.value || DEFAULT_CURRENCY}
                                onChange={currencyField.onChange}
                                onBlur={currencyField.onBlur}
                                error={!!errors.items?.[methodKey]?.currency}
                                helperText={
                                  errors.items?.[methodKey]?.currency?.message
                                }
                              >
                                {currencies.map((c) => (
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

        <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end" }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={isPending}
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
