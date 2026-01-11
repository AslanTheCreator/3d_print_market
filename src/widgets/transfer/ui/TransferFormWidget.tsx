"use client";

import React, { useEffect, useRef, useMemo } from "react";
import {
  Box,
  TextField,
  Button,
  Stack,
  Typography,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  FormControl,
  InputAdornment,
  Grid,
  Collapse,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  LocalShipping,
  Store,
  Mail,
  ExpandMore,
  ExpandLess,
  InfoOutlined,
} from "@mui/icons-material";
import { useForm, Controller } from "react-hook-form";
import { useUserTransfers, useSaveTransfersBatch } from "@/entities/transfer";

import type { TransferCreateModel } from "@/entities/transfer/model/types";
import { useNotification } from "@/app/providers";
import { useDictionary } from "@/entities/dictionary";

interface FormData {
  methods: {
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [expandedMethods, setExpandedMethods] = React.useState<Set<string>>(
    new Set()
  );

  const isInitialized = useRef(false);

  const { data: shippingMethods, isLoading: methodsLoading } =
    useDictionary("SHOPPING_METHODS");
  const { data: currencies, isLoading: currenciesLoading } =
    useDictionary("CURRENCY");
  const { data: userTransfers = [], isLoading: transfersLoading } =
    useUserTransfers();
  const { mutateAsync: saveBatch, isPending } = useSaveTransfersBatch();
  const { showNotification } = useNotification();

  const availableMethods = useMemo(
    () =>
      shippingMethods?.filter((method) => method.value !== "FREE_POST") || [],
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
    defaultValues: { methods: {} },
  });

  // Инициализация формы - происходит только один раз
  useEffect(() => {
    if (
      !isInitialized.current &&
      availableMethods.length > 0 &&
      !transfersLoading
    ) {
      const methodsData: FormData["methods"] = {};
      const expanded = new Set<string>();

      availableMethods.forEach((method) => {
        const existingTransfer = userTransfers.find(
          (t) => t.sending === method.value
        );

        if (existingTransfer) {
          methodsData[method.value] = {
            enabled: true,
            price: existingTransfer.price,
            currency: existingTransfer.currency,
          };
          expanded.add(method.value);
        } else {
          methodsData[method.value] = {
            enabled: false,
            price: 0,
            currency: "RUB",
          };
        }
      });

      setValue("methods", methodsData, { shouldDirty: false });
      setExpandedMethods(expanded);
      isInitialized.current = true;
    }
  }, [availableMethods, userTransfers, transfersLoading, setValue]);

  const methodsData = watch("methods");

  const handleMethodToggle = (methodValue: string) => {
    setExpandedMethods((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(methodValue)) {
        newSet.delete(methodValue);
      } else {
        newSet.add(methodValue);
      }
      return newSet;
    });
  };

  const handleCheckboxChange = (
    fieldOnChange: (checked: boolean) => void,
    checked: boolean,
    methodValue: string
  ) => {
    fieldOnChange(checked);

    if (checked) {
      setExpandedMethods((prev) => new Set(prev).add(methodValue));
    } else {
      setExpandedMethods((prev) => {
        const newSet = new Set(prev);
        newSet.delete(methodValue);
        return newSet;
      });
    }
  };

  const onSubmit = async (data: FormData) => {
    const toCreate: TransferCreateModel[] = [];
    const toDelete: number[] = [];

    availableMethods.forEach((method) => {
      const wasEnabled = userTransfers.some((t) => t.sending === method.value);
      const nowEnabled = !!data.methods[method.value]?.enabled;
      const isPickup = method.value === "PRODUCT_PICKUP";

      if (nowEnabled && !wasEnabled) {
        toCreate.push({
          sending: method.value as any,
          price: isPickup ? 0 : data.methods[method.value].price,
          currency: data.methods[method.value].currency as any,
          imageId: 1,
        });
      }

      if (!nowEnabled && wasEnabled) {
        const transfer = userTransfers.find((t) => t.sending === method.value);
        if (transfer?.id) toDelete.push(transfer.id);
      }
    });

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
        sx={{
          mb: 3,
          borderRadius: 2,
          "& .MuiAlert-message": {
            fontSize: { xs: "0.813rem", sm: "0.875rem" },
          },
        }}
      >
        Выберите способы отправки товара и укажите стоимость доставки. Эта
        информация будет видна покупателям.
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
            Выберите способы доставки
          </Typography>

          <Stack spacing={2}>
            {availableMethods.map((method) => {
              const isExpanded = expandedMethods.has(method.value);
              const isEnabled = methodsData?.[method.value]?.enabled || false;
              const isPickup = method.value === "PRODUCT_PICKUP";

              return (
                <Card
                  key={method.value}
                  sx={{
                    transition: "all 0.2s",
                    border: `2px solid ${
                      isEnabled
                        ? theme.palette.primary.main
                        : theme.palette.divider
                    }`,
                    boxShadow: isEnabled
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
                      sx={{ cursor: "pointer" }}
                      onClick={() => {
                        if (isEnabled) handleMethodToggle(method.value);
                      }}
                    >
                      <Box display="flex" alignItems="center" gap={2} flex={1}>
                        <Controller
                          name={`methods.${method.value}.enabled`}
                          control={control}
                          render={({ field }) => (
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={field.value || false}
                                  onChange={(e) =>
                                    handleCheckboxChange(
                                      field.onChange,
                                      e.target.checked,
                                      method.value
                                    )
                                  }
                                />
                              }
                              label=""
                              sx={{ m: 0 }}
                            />
                          )}
                        />
                        <Box
                          sx={{
                            color: isEnabled ? "primary.main" : "action.active",
                            display: { xs: "none", sm: "flex" },
                          }}
                        >
                          {getShippingIcon(method.value)}
                        </Box>
                        <Box flex={1}>
                          <Typography
                            variant="body1"
                            fontWeight={isEnabled ? 600 : 500}
                            sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                          >
                            {method.description}
                          </Typography>
                        </Box>
                      </Box>
                      {isEnabled && !isPickup && (
                        <Box sx={{ ml: 1 }}>
                          {isExpanded ? <ExpandLess /> : <ExpandMore />}
                        </Box>
                      )}
                    </Box>

                    <Collapse
                      in={isEnabled && isExpanded && !isPickup}
                      timeout="auto"
                    >
                      <Box sx={{ mt: 3, pl: { xs: 0, sm: 7 } }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={8}>
                            <Controller
                              name={`methods.${method.value}.price`}
                              control={control}
                              rules={{
                                required: isEnabled
                                  ? "Укажите стоимость доставки"
                                  : false,
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
                                    if (val === "" || /^\d*\.?\d*$/.test(val)) {
                                      onChange(
                                        val === "" ? 0 : parseFloat(val)
                                      );
                                    }
                                  }}
                                  fullWidth
                                  label="Стоимость доставки"
                                  placeholder="0"
                                  error={
                                    !!errors.methods?.[method.value]?.price
                                  }
                                  helperText={
                                    errors.methods?.[method.value]?.price
                                      ?.message
                                  }
                                  size={isMobile ? "small" : "medium"}
                                  InputProps={{
                                    endAdornment: (
                                      <InputAdornment position="end">
                                        ₽
                                      </InputAdornment>
                                    ),
                                  }}
                                  inputProps={{ inputMode: "decimal" }}
                                />
                              )}
                            />
                          </Grid>

                          <Grid item xs={12} sm={4}>
                            <Controller
                              name={`methods.${method.value}.currency`}
                              control={control}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  select
                                  fullWidth
                                  label="Валюта"
                                  size={isMobile ? "small" : "medium"}
                                  SelectProps={{ native: true }}
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
                      </Box>
                    </Collapse>
                  </CardContent>
                </Card>
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
              !Object.values(methodsData || {}).some((m) => m.enabled)
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
