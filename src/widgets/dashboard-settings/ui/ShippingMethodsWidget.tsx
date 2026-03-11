"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import { Controller, useForm, useWatch } from "react-hook-form";
import {
  useTransfers,
  useCreateTransfer,
  useUpdateTransfer,
  useDeleteTransfer,
  SHIPPING_ICONS,
  type TransferInput,
} from "@/entities/transfer";
import { useDictionary } from "@/entities/dictionary";
import { useNotification } from "@/shared/ui/notification";
import { CollapsibleFormCard } from "@/shared/ui/collapsible-form-card";
import type { DictionaryItem } from "@/entities/dictionary";
import type { Currency, ShippingMethod, Transfer } from "@/shared/types";

interface TransferFormItem {
  enabled: boolean;
  price: number;
  currency: Currency;
}

interface TransferFormData {
  items: Record<string, TransferFormItem>;
}

const FREE_METHODS = new Set<ShippingMethod>(["PRODUCT_PICKUP"]);
const REQUIRED_PRICE_METHODS = new Set<ShippingMethod>([
  "TRANSPORT_COMPANY",
  "RUSSIAN_POST",
]);
const DEFAULT_CURRENCY: Currency = "RUB";

function buildDefaultValues(
  methods: DictionaryItem[],
  existing: Transfer[],
): TransferFormData {
  const byMethod: Record<string, Transfer> = {};
  for (const transfer of existing) {
    byMethod[transfer.sending] = transfer;
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
  const existingMethods = new Set(existing.map((transfer) => transfer.sending));
  const expanded = new Set<string>();

  for (const method of methods) {
    if (existingMethods.has(method.value as ShippingMethod)) {
      expanded.add(method.value);
    }
  }

  return expanded;
}

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

  const existingByMethod = useMemo(() => {
    const map: Record<string, Transfer> = {};
    for (const transfer of existing) {
      map[transfer.sending] = transfer;
    }
    return map;
  }, [existing]);

  const currencyLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const currency of currencies) {
      map[currency.value] = currency.description;
    }
    return map;
  }, [currencies]);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<TransferFormData>({
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: buildDefaultValues(methods, existing),
  });

  const [expandedItems, setExpandedItems] = useState<Set<string>>(() =>
    buildInitialExpanded(methods, existing),
  );
  const [wasSaved, setWasSaved] = useState(false);

  const draftValuesRef = useRef<
    Record<string, Pick<TransferFormItem, "price" | "currency">>
  >({});
  const itemsData = useWatch({
    control,
    name: "items",
  });

  useEffect(() => {
    reset(buildDefaultValues(methods, existing));
    setWasSaved(false);
  }, [existing, methods, reset]);

  useEffect(() => {
    if (!itemsData) return;

    for (const [method, item] of Object.entries(itemsData)) {
      draftValuesRef.current[method] = {
        price: item.price ?? 0,
        currency: item.currency ?? DEFAULT_CURRENCY,
      };
    }
  }, [itemsData]);

  const toggleExpanded = useCallback((key: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleEnabledChange = useCallback(
    (
      key: string,
      checked: boolean,
      onChange: (value: boolean) => void,
    ) => {
      const method = key as ShippingMethod;
      const isFree = FREE_METHODS.has(method);
      const shouldClearPrice = REQUIRED_PRICE_METHODS.has(method);

      setWasSaved(false);
      onChange(checked);

      if (!checked) {
        if (shouldClearPrice) {
          draftValuesRef.current[key] = {
            price: 0,
            currency:
              itemsData?.[key]?.currency ??
              draftValuesRef.current[key]?.currency ??
              DEFAULT_CURRENCY,
          };
          setValue(`items.${key}.price`, 0, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          });
        }
        return;
      }

      const draft = draftValuesRef.current[key];

      setValue(`items.${key}.currency`, draft?.currency ?? DEFAULT_CURRENCY, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });

      if (!isFree) {
        setValue(`items.${key}.price`, draft?.price ?? 0, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
      }
    },
    [itemsData, setValue],
  );

  const hasChanges = useMemo(() => {
    if (!itemsData) return false;

    for (const [method, formItem] of Object.entries(itemsData)) {
      const previous = existingByMethod[method];
      const wasEnabled = !!previous;
      const nowEnabled = !!formItem.enabled;

      if (wasEnabled !== nowEnabled) {
        return true;
      }

      if (wasEnabled && nowEnabled) {
        const isFree = FREE_METHODS.has(method as ShippingMethod);
        if (!isFree && previous.price !== formItem.price) {
          return true;
        }
        if (previous.currency !== formItem.currency) {
          return true;
        }
      }
    }

    return false;
  }, [itemsData, existingByMethod]);

  const hasBlockingValidationErrors = useMemo(() => {
    if (!itemsData) return false;

    return Object.entries(itemsData).some(([method, formItem]) => {
      if (!formItem.enabled) {
        return false;
      }

      const shippingMethod = method as ShippingMethod;
      const requiresPrice = REQUIRED_PRICE_METHODS.has(shippingMethod);

      if (!formItem.currency) {
        return true;
      }

      if (requiresPrice && formItem.price <= 0) {
        return true;
      }

      return false;
    });
  }, [itemsData]);

  const canSubmit = hasChanges && !hasBlockingValidationErrors && !isPending;

  const statusText = useMemo(() => {
    if (isPending) {
      return "Сохраняем изменения...";
    }

    if (hasBlockingValidationErrors) {
      return "Заполните обязательные поля, чтобы сохранить изменения.";
    }

    if (hasChanges) {
      return "Есть несохраненные изменения.";
    }

    if (wasSaved) {
      return "Изменения сохранены.";
    }

    return "Изменений нет.";
  }, [hasBlockingValidationErrors, hasChanges, isPending, wasSaved]);

  const getMethodBadge = useCallback(
    (method: ShippingMethod, item?: TransferFormItem) => {
      if (!item?.enabled) {
        return <Chip size="small" label="Не включен" variant="outlined" />;
      }

      if (FREE_METHODS.has(method)) {
        return <Chip size="small" label="Бесплатно" color="success" />;
      }

      if (item.price > 0) {
        return (
          <Chip
            size="small"
            label={`${item.price} ${currencyLabels[item.currency] ?? item.currency}`}
            color="primary"
            variant="outlined"
          />
        );
      }

      return (
        <Chip
          size="small"
          label="Нужно указать цену"
          color="warning"
          variant="outlined"
        />
      );
    },
    [currencyLabels],
  );

  const onSubmit = useCallback(
    async (data: TransferFormData) => {
      const operations: Promise<unknown>[] = [];

      for (const [method, formItem] of Object.entries(data.items)) {
        const previous = existingByMethod[method];
        const isFree = FREE_METHODS.has(method as ShippingMethod);
        const input: TransferInput = {
          sending: method as ShippingMethod,
          price: isFree ? 0 : formItem.price,
          currency: formItem.currency,
        };

        if (formItem.enabled) {
          if (previous) {
            const changed =
              previous.price !== input.price ||
              previous.currency !== input.currency;

            if (changed) {
              operations.push(
                updateMutation.mutateAsync({ id: previous.id, input }),
              );
            }
          } else {
            operations.push(createMutation.mutateAsync(input));
          }
        } else if (previous) {
          operations.push(deleteMutation.mutateAsync(previous.id));
        }
      }

      if (operations.length === 0) {
        showNotification("Нет изменений для сохранения", "info");
        return;
      }

      try {
        await Promise.all(operations);
        setExpandedItems(new Set());
        setWasSaved(true);
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
      createMutation,
      deleteMutation,
      existingByMethod,
      showNotification,
      updateMutation,
    ],
  );

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
              const shippingMethod = key as ShippingMethod;
              const isEnabled = itemsData?.[key]?.enabled ?? false;
              const isExpanded = expandedItems.has(key);
              const isFree = FREE_METHODS.has(shippingMethod);
              const isRequiredPrice = REQUIRED_PRICE_METHODS.has(shippingMethod);

              return (
                <Controller
                  key={key}
                  name={`items.${key}.enabled`}
                  control={control}
                  render={({ field }) => (
                    <CollapsibleFormCard
                      value={key}
                      label={method.description}
                      description={
                        isRequiredPrice ? "Стоимость доставки обязательна" : undefined
                      }
                      badge={getMethodBadge(shippingMethod, itemsData?.[key])}
                      icon={SHIPPING_ICONS[shippingMethod] ?? null}
                      isEnabled={field.value ?? false}
                      isExpanded={isExpanded}
                      onEnabledChange={(checked) =>
                        handleEnabledChange(key, checked, field.onChange)
                      }
                      onToggleExpand={() => toggleExpanded(key)}
                      showExpandIcon={!isFree}
                    >
                      {!isFree && (
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Controller
                              name={`items.${key}.price`}
                              control={control}
                              rules={{
                                validate: (value) => {
                                  if (!isEnabled || !isRequiredPrice) {
                                    return true;
                                  }

                                  return value > 0 || "Укажите стоимость доставки";
                                },
                              }}
                              render={({ field: priceField }) => (
                                <TextField
                                  {...priceField}
                                  value={
                                    priceField.value === 0 ||
                                    priceField.value == null
                                      ? ""
                                      : String(priceField.value)
                                  }
                                  onChange={(event) => {
                                    setWasSaved(false);
                                    const raw = event.target.value;

                                    if (raw !== "" && !/^\d+$/.test(raw)) {
                                      return;
                                    }

                                    const cleaned = raw.replace(/^0+(\d)/, "$1");
                                    priceField.onChange(
                                      cleaned === "" ? 0 : Number(cleaned),
                                    );
                                  }}
                                  type="text"
                                  inputMode="numeric"
                                  fullWidth
                                  label="Стоимость доставки"
                                  placeholder="0"
                                  error={!!errors.items?.[key]?.price}
                                  helperText={
                                    errors.items?.[key]?.price?.message ??
                                    (isRequiredPrice
                                      ? "Обязательное поле для этого способа доставки"
                                      : "")
                                  }
                                />
                              )}
                            />
                          </Grid>

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
                                  value={currencyField.value ?? DEFAULT_CURRENCY}
                                  onChange={(event) => {
                                    setWasSaved(false);
                                    currencyField.onChange(event);
                                  }}
                                  select
                                  fullWidth
                                  label="Валюта"
                                  error={!!errors.items?.[key]?.currency}
                                  helperText={
                                    errors.items?.[key]?.currency?.message ??
                                    "Валюта применяется к стоимости доставки"
                                  }
                                >
                                  {currencies.map((currency) => (
                                    <MenuItem
                                      key={currency.value}
                                      value={currency.value}
                                    >
                                      {currency.description}
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

        <Box
          sx={{
            mt: 4,
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Typography
            variant="body2"
            color={
              hasBlockingValidationErrors
                ? "error.main"
                : hasChanges
                  ? "text.primary"
                  : "text.secondary"
            }
          >
            {statusText}
          </Typography>

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={!canSubmit}
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

export const ShippingMethodsWidget: React.FC = () => {
  const { data: shippingMethods, isLoading: methodsLoading } =
    useDictionary("SHOPPING_METHODS");
  const { data: currencies, isLoading: currenciesLoading } =
    useDictionary("CURRENCY");
  const { data: transfers = [], isLoading: transfersLoading } = useTransfers();

  const isLoading = methodsLoading || currenciesLoading || transfersLoading;

  const availableMethods = useMemo(
    () => shippingMethods?.filter((method) => method.value !== "FREE_POST") ?? [],
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

  return (
    <TransferForm
      methods={availableMethods}
      currencies={currencies}
      existing={transfers}
    />
  );
};
