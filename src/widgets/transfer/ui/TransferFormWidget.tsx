"use client";

import React, { useState, useCallback, useMemo } from "react";
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
import { InfoOutlined } from "@mui/icons-material";
import { useForm, Controller } from "react-hook-form";
import {
  useTransfers,
  useCreateTransfer,
  useUpdateTransfer,
  useDeleteTransfer,
  SHIPPING_ICONS,
  type ShippingMethod,
  type Transfer,
  type TransferInput,
} from "@/entities/transfer";
import { useDictionary } from "@/entities/dictionary";
import { useNotification } from "@/app/providers";
import { CollapsibleFormCard } from "@/shared/ui/collapsible-form-card";
import type { DictionaryItem } from "@/entities/dictionary/model/types";
import type { Currency } from "@/shared/types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TransferFormItem {
  enabled: boolean;
  price: number;
  currency: string;
}

interface TransferFormData {
  items: Record<string, TransferFormItem>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const FREE_METHODS = new Set(["PRODUCT_PICKUP"]);
const DEFAULT_CURRENCY = "RUB";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildDefaultValues(
  methods: DictionaryItem[],
  existing: Transfer[],
): TransferFormData {
  const byMethod: Record<string, Transfer> = {};
  for (const t of existing) {
    byMethod[t.sending] = t;
  }

  const items: Record<string, TransferFormItem> = {};
  for (const method of methods) {
    const found = byMethod[method.value];
    items[method.value] = {
      enabled: !!found,
      price: found?.price ?? 0,
      currency: found?.currency ?? DEFAULT_CURRENCY,
    };
  }

  return { items };
}

function buildInitialExpanded(
  methods: DictionaryItem[],
  existing: Transfer[],
): Set<string> {
  const existingMethods = new Set(existing.map((t) => t.sending));
  const expanded = new Set<string>();
  for (const method of methods) {
    if (existingMethods.has(method.value as ShippingMethod)) {
      expanded.add(method.value);
    }
  }
  return expanded;
}

// ─────────────────────────────────────────────────────────────────────────────
// Form Component (рендерится ТОЛЬКО когда данные загружены)
// ─────────────────────────────────────────────────────────────────────────────

interface TransferFormProps {
  methods: DictionaryItem[];
  currencies: DictionaryItem[];
  existing: Transfer[];
}

const TransferForm: React.FC<TransferFormProps> = ({
  methods,
  currencies,
  existing,
}) => {
  const { showNotification } = useNotification();

  const createMutation = useCreateTransfer();
  const updateMutation = useUpdateTransfer();
  const deleteMutation = useDeleteTransfer();

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  // Маппинг существующих трансферов — для submit
  const existingByMethod = useMemo(() => {
    const map: Record<string, Transfer> = {};
    for (const t of existing) {
      map[t.sending] = t;
    }
    return map;
  }, [existing]);

  // defaultValues — вычисляются ОДИН раз
  const [defaultValues] = useState(() => buildDefaultValues(methods, existing));

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<TransferFormData>({
    mode: "onChange",
    defaultValues,
  });

  // Раскрытые карточки
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() =>
    buildInitialExpanded(methods, existing),
  );

  const toggleExpanded = useCallback((key: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const itemsData = watch("items");

  // Есть ли изменения относительно серверных данных
  const hasChanges = useMemo(() => {
    if (!itemsData) return false;

    for (const [method, formItem] of Object.entries(itemsData)) {
      const prev = existingByMethod[method];
      const wasEnabled = !!prev;
      const nowEnabled = !!formItem.enabled;

      // Включили новый или выключили существующий
      if (wasEnabled !== nowEnabled) return true;

      // Изменили price/currency у существующего
      if (wasEnabled && nowEnabled) {
        const isFree = FREE_METHODS.has(method);
        if (!isFree && prev.price !== formItem.price) return true;
        if (prev.currency !== formItem.currency) return true;
      }
    }

    return false;
  }, [itemsData, existingByMethod]);

  // ─────────────────────────────────────────────────────────────────────────
  // Submit
  // ─────────────────────────────────────────────────────────────────────────

  const onSubmit = useCallback(
    async (data: TransferFormData) => {
      const operations: Promise<unknown>[] = [];

      for (const [method, formItem] of Object.entries(data.items)) {
        const prev = existingByMethod[method];
        const isFree = FREE_METHODS.has(method);

        const input: TransferInput = {
          sending: method as ShippingMethod,
          price: isFree ? 0 : formItem.price,
          currency: formItem.currency as Currency,
        };

        if (formItem.enabled) {
          if (prev) {
            // Обновляем только при изменениях
            const hasChanges =
              prev.price !== input.price || prev.currency !== input.currency;
            if (hasChanges) {
              operations.push(
                updateMutation.mutateAsync({ id: prev.id, input }),
              );
            }
          } else {
            operations.push(createMutation.mutateAsync(input));
          }
        } else if (prev) {
          operations.push(deleteMutation.mutateAsync(prev.id));
        }
      }

      if (operations.length === 0) {
        showNotification("Нет изменений для сохранения", "info");
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
    },
    [
      existingByMethod,
      createMutation,
      updateMutation,
      deleteMutation,
      showNotification,
    ],
  );

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
            {methods.map((method) => {
              const key = method.value;
              const isEnabled = itemsData?.[key]?.enabled ?? false;
              const isExpanded = expandedItems.has(key);
              const isFree = FREE_METHODS.has(key);

              return (
                <Controller
                  key={key}
                  name={`items.${key}.enabled`}
                  control={control}
                  render={({ field }) => (
                    <CollapsibleFormCard
                      value={key}
                      label={method.description}
                      icon={SHIPPING_ICONS[key as ShippingMethod] ?? null}
                      isEnabled={field.value ?? false}
                      isExpanded={isExpanded}
                      onEnabledChange={field.onChange}
                      onToggleExpand={() => toggleExpanded(key)}
                      showExpandIcon={!isFree}
                    >
                      {!isFree && (
                        <Grid container spacing={2}>
                          {/* Цена */}
                          <Grid item xs={12} sm={6}>
                            <Controller
                              name={`items.${key}.price`}
                              control={control}
                              rules={{
                                required: isEnabled
                                  ? "Укажите стоимость доставки"
                                  : false,
                                min: isEnabled
                                  ? { value: 0, message: "Минимум 0" }
                                  : undefined,
                              }}
                              render={({ field: priceField }) => (
                                <TextField
                                  {...priceField}
                                  value={priceField.value ?? 0}
                                  type="number"
                                  fullWidth
                                  label="Стоимость доставки"
                                  inputProps={{ min: 0, step: 1 }}
                                  error={!!errors.items?.[key]?.price}
                                  helperText={
                                    errors.items?.[key]?.price?.message
                                  }
                                  onChange={(e) =>
                                    priceField.onChange(
                                      Number(e.target.value) || 0,
                                    )
                                  }
                                />
                              )}
                            />
                          </Grid>

                          {/* Валюта */}
                          <Grid item xs={12} sm={6}>
                            <Controller
                              name={`items.${key}.currency`}
                              control={control}
                              rules={{
                                required: isEnabled ? "Выберите валюту" : false,
                              }}
                              render={({ field: currencyField }) => (
                                <TextField
                                  {...currencyField}
                                  value={
                                    currencyField.value ?? DEFAULT_CURRENCY
                                  }
                                  select
                                  fullWidth
                                  label="Валюта"
                                  error={!!errors.items?.[key]?.currency}
                                  helperText={
                                    errors.items?.[key]?.currency?.message
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
        </FormControl>

        <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end" }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={
              isPending ||
              !Object.values(itemsData || {}).some((n) => n.enabled)
            }
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

// ─────────────────────────────────────────────────────────────────────────────
// Loader Component (публичный экспорт)
// ─────────────────────────────────────────────────────────────────────────────

export const TransferFormWidget: React.FC = () => {
  const { data: shippingMethods, isLoading: methodsLoading } =
    useDictionary("SHOPPING_METHODS");
  const { data: currencies, isLoading: currenciesLoading } =
    useDictionary("CURRENCY");
  const { data: transfers = [], isLoading: transfersLoading } = useTransfers();

  const isLoading = methodsLoading || currenciesLoading || transfersLoading;

  // Фильтруем FREE_POST — его нельзя выбрать вручную
  const availableMethods = useMemo(
    () => shippingMethods?.filter((m) => m.value !== "FREE_POST") ?? [],
    [shippingMethods],
  );

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
        Не удалось загрузить валюты. Попробуйте обновить страницу.
      </Alert>
    );
  }

  // Форма рендерится ТОЛЬКО когда все данные готовы
  return (
    <TransferForm
      methods={availableMethods}
      currencies={currencies}
      existing={transfers}
    />
  );
};
