"use client";

import React from "react";
import {
  Box,
  TextField,
  Button,
  Stack,
  Typography,
  FormControl,
  InputAdornment,
  Grid,
  CircularProgress,
  Alert,
} from "@mui/material";
import { LocalShipping, Store, Mail, InfoOutlined } from "@mui/icons-material";
import { useForm, Controller } from "react-hook-form";
import {
  useUserTransfers,
  useSaveTransfersBatch,
  ShoppingMethods,
} from "@/entities/transfer";
import { useNotification } from "@/app/providers";
import { useDictionary } from "@/entities/dictionary";
import { CollapsibleFormCard } from "@/shared/ui/collapsible-form-card/CollapsibleFormCard";
import { useBatchForm } from "@/shared/hooks/useBatchForm";
import { useFormInitializer } from "@/shared/hooks/useFormInitializer";

interface FormData {
  items: {
    [key: string]: {
      enabled: boolean;
      price: number;
      currency: string;
    };
  };
}

const getShippingIcon = (value: string) => {
  switch (value) {
    case "PRODUCT_PICKUP":
      return <Store />;
    case "TRANSPORT_COMPANY":
      return <LocalShipping />;
    case "RUSSIAN_POST":
      return <Mail />;
    default:
      return <LocalShipping />;
  }
};

export const TransferFormWidget = () => {
  const { data: shippingMethods, isLoading: methodsLoading } =
    useDictionary("SHOPPING_METHODS");
  const { data: currencies, isLoading: currenciesLoading } =
    useDictionary("CURRENCY");
  const { data: userTransfers = [], isLoading: transfersLoading } =
    useUserTransfers();
  const { mutateAsync: saveBatch, isPending } = useSaveTransfersBatch();
  const { showNotification } = useNotification();

  // Фильтруем методы (убираем FREE_POST)
  const availableMethods = React.useMemo(
    () => shippingMethods?.filter((m) => m.value !== "FREE_POST") || [],
    [shippingMethods]
  );

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

  const { toggleExpanded, isExpanded, computeChanges } = useBatchForm({
    existingItems: userTransfers,
    getItemKey: (item) => item.sending,
    mapToCreateModel: (data, key) => ({
      sending: key as ShoppingMethods,
      price: key === "PRODUCT_PICKUP" ? 0 : data.price,
      currency: data.currency as any,
      imageId: 1,
    }),
    getItemId: (item) => item.id,
  });

  useFormInitializer({
    dictionaryItems: availableMethods,
    existingItems: userTransfers,
    isLoading: transfersLoading,
    setValue,
    getDictionaryKey: (item) => item.value,
    getExistingKey: (item) => item.sending,
    mapExistingToFormData: (item) => ({
      price: item.price,
      currency: item.currency,
    }),
    getDefaultFormData: () => ({ price: 0, currency: "RUB" }),
    onInitialized: (expanded) => {
      expanded.forEach((key) => toggleExpanded(key));
    },
  });

  const itemsData = watch("items");

  const onSubmit = async (data: FormData) => {
    const { toCreate, toDelete } = computeChanges(data.items);

    if (toCreate.length === 0 && toDelete.length === 0) {
      showNotification("Ничего не изменилось", "info");
      return;
    }

    await saveBatch({ toCreate, toDelete });
  };

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
            sx={{ mb: 2, fontSize: "1.125rem", fontWeight: 600 }}
          >
            Выберите способы доставки
          </Typography>

          <Stack spacing={2}>
            {availableMethods.map((method) => {
              const isEnabled = itemsData?.[method.value]?.enabled || false;
              const isPickup = method.value === "PRODUCT_PICKUP";

              return (
                <Controller
                  key={method.value}
                  name={`items.${method.value}.enabled`}
                  control={control}
                  render={({ field }) => (
                    <CollapsibleFormCard
                      value={method.value}
                      label={method.description}
                      icon={getShippingIcon(method.value)}
                      isEnabled={field.value || false}
                      isExpanded={isExpanded(method.value)}
                      onEnabledChange={field.onChange}
                      onToggleExpand={() => toggleExpanded(method.value)}
                      showExpandIcon={!isPickup}
                    >
                      {!isPickup && (
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={8}>
                            <Controller
                              name={`items.${method.value}.price`}
                              control={control}
                              rules={{
                                required: isEnabled
                                  ? "Укажите стоимость"
                                  : false,
                                min: {
                                  value: 0,
                                  message: "Не может быть отрицательной",
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
                                    if (val === "" || /^\d*\.?\d*$/.test(val)) {
                                      onChange(
                                        val === "" ? 0 : parseFloat(val)
                                      );
                                    }
                                  }}
                                  fullWidth
                                  label="Стоимость доставки"
                                  error={!!errors.items?.[method.value]?.price}
                                  helperText={
                                    errors.items?.[method.value]?.price?.message
                                  }
                                  InputProps={{
                                    endAdornment: (
                                      <InputAdornment position="end">
                                        ₽
                                      </InputAdornment>
                                    ),
                                  }}
                                />
                              )}
                            />
                          </Grid>

                          <Grid item xs={12} sm={4}>
                            <Controller
                              name={`items.${method.value}.currency`}
                              control={control}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  select
                                  fullWidth
                                  label="Валюта"
                                  SelectProps={{ native: true }}
                                >
                                  {currencies?.map((c) => (
                                    <option key={c.value} value={c.value}>
                                      {c.description}
                                    </option>
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
              !Object.values(itemsData || {}).some((m) => m.enabled)
            }
            sx={{ minWidth: { xs: "100%", sm: 180 } }}
            startIcon={isPending ? <CircularProgress size={16} /> : undefined}
          >
            {isPending ? "Сохранение..." : "Сохранить"}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};
