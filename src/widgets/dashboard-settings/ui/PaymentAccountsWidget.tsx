"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  AccountBalance,
  CreditCard,
  InfoOutlined,
  Payments,
} from "@mui/icons-material";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useDictionary } from "@/entities/dictionary";
import {
  useCreateAccount,
  useDeleteAccount,
  useUpdateAccount,
  useUserAccounts,
} from "@/entities/account";
import { useNotification } from "@/shared/ui/notification";
import { CollapsibleFormCard } from "@/shared/ui/collapsible-form-card";
import type { DictionaryItem } from "@/entities/dictionary";
import type { AccountsBaseModel, TransferMoney } from "@/shared/types";
import { useInvalidateSellerSettings } from "../model/useInvalidateSellerSettings";

interface AccountFormItem {
  enabled: boolean;
  username: string;
  entityValue: string;
  comment: string;
}

interface AccountFormData {
  items: Record<string, AccountFormItem>;
}

function getPaymentIcon(value: string) {
  switch (value) {
    case "BANK_CARD":
      return <CreditCard />;
    case "BANK_SBP":
      return <AccountBalance />;
    case "CASH":
      return <Payments />;
    default:
      return <CreditCard />;
  }
}

function getEntityLabel(value: string) {
  switch (value) {
    case "BANK_CARD":
      return "Номер карты";
    case "BANK_SBP":
      return "Номер телефона";
    case "CASH":
      return "Способ передачи";
    default:
      return "Реквизиты";
  }
}

function getEntityPlaceholder(value: string) {
  switch (value) {
    case "BANK_CARD":
      return "0000 0000 0000 0000";
    case "BANK_SBP":
      return "+7 (000) 000-00-00";
    case "CASH":
      return "Укажите детали";
    default:
      return "Введите реквизиты";
  }
}

function buildDefaultValues(
  methods: DictionaryItem[],
  existing: AccountsBaseModel[],
): AccountFormData {
  const byMethod: Record<string, AccountsBaseModel> = {};
  for (const account of existing) {
    byMethod[account.transferMoney] = account;
  }

  const items: Record<string, AccountFormItem> = {};
  for (const method of methods) {
    const found = byMethod[method.value];
    items[method.value] = {
      enabled: !!found,
      username: found?.username ?? "",
      entityValue: found?.entityValue ?? "",
      comment: found?.comment ?? "",
    };
  }

  return { items };
}

function buildInitialExpanded(
  methods: DictionaryItem[],
  existing: AccountsBaseModel[],
): Set<string> {
  const existingMethods = new Set(existing.map((account) => account.transferMoney));
  const expanded = new Set<string>();

  for (const method of methods) {
    if (existingMethods.has(method.value as TransferMoney)) {
      expanded.add(method.value);
    }
  }

  return expanded;
}

function trimValue(value: string) {
  return value.trim();
}

function getAccountBadge(item?: AccountFormItem) {
  if (!item?.enabled) {
    return <Chip size="small" label="Не включен" variant="outlined" />;
  }

  const entity = trimValue(item.entityValue);
  const username = trimValue(item.username);

  if (entity) {
    return <Chip size="small" label={entity} color="primary" variant="outlined" />;
  }

  if (username) {
    return <Chip size="small" label={username} color="primary" variant="outlined" />;
  }

  return (
    <Chip
      size="small"
      label="Нужно заполнить данные"
      color="warning"
      variant="outlined"
    />
  );
}

interface AccountsFormProps {
  methods: DictionaryItem[];
  existing: AccountsBaseModel[];
}

const AccountsForm: React.FC<AccountsFormProps> = ({ methods, existing }) => {
  const { showNotification } = useNotification();
  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();
  const deleteMutation = useDeleteAccount();
  const invalidateSellerSettings = useInvalidateSellerSettings();

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const existingByMethod = useMemo(() => {
    const map: Record<string, AccountsBaseModel> = {};
    for (const account of existing) {
      map[account.transferMoney] = account;
    }
    return map;
  }, [existing]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AccountFormData>({
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: buildDefaultValues(methods, existing),
  });

  const [expandedItems, setExpandedItems] = useState<Set<string>>(() =>
    buildInitialExpanded(methods, existing),
  );
  const [wasSaved, setWasSaved] = useState(false);

  const itemsData = useWatch({
    control,
    name: "items",
  });

  useEffect(() => {
    reset(buildDefaultValues(methods, existing));
    setWasSaved(false);
  }, [existing, methods, reset]);

  const toggleExpanded = useCallback((key: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const hasChanges = useMemo(() => {
    if (!itemsData) return false;

    for (const [method, formItem] of Object.entries(itemsData)) {
      const prev = existingByMethod[method];
      const wasEnabled = !!prev;
      const nowEnabled = !!formItem.enabled;

      if (wasEnabled !== nowEnabled) return true;

      if (wasEnabled && nowEnabled) {
        if (trimValue(prev.username) !== trimValue(formItem.username)) return true;
        if (trimValue(prev.entityValue) !== trimValue(formItem.entityValue)) return true;
        if (trimValue(prev.comment ?? "") !== trimValue(formItem.comment ?? "")) return true;
      }
    }

    return false;
  }, [itemsData, existingByMethod]);

  const hasBlockingValidationErrors = useMemo(() => {
    if (!itemsData) return false;

    return Object.values(itemsData).some((item) => {
      if (!item.enabled) {
        return false;
      }

      return !trimValue(item.username) || !trimValue(item.entityValue);
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

  const onSubmit = useCallback(
    async (data: AccountFormData) => {
      const operations: Promise<unknown>[] = [];

      for (const [method, formItem] of Object.entries(data.items)) {
        const prev = existingByMethod[method];
        const input = {
          transferMoney: method as TransferMoney,
          username: trimValue(formItem.username),
          entityValue: trimValue(formItem.entityValue),
          comment: trimValue(formItem.comment),
        };

        if (formItem.enabled) {
          if (prev) {
            const changed =
              trimValue(prev.username) !== input.username ||
              trimValue(prev.entityValue) !== input.entityValue ||
              trimValue(prev.comment ?? "") !== input.comment;

            if (changed) {
              operations.push(
                updateMutation.mutateAsync({
                  id: prev.id,
                  input,
                }),
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
        await invalidateSellerSettings();
        setExpandedItems(new Set());
        setWasSaved(true);
        showNotification("Способы оплаты сохранены", "success");
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
      invalidateSellerSettings,
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
        Выберите способы оплаты товара и укажите необходимую информацию. Эти данные будут видны покупателям.
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
            Способы оплаты
          </Typography>

          <Stack spacing={2}>
            {methods.map((method) => {
              const key = method.value;
              const isEnabled = itemsData?.[key]?.enabled ?? false;
              const isExpanded = expandedItems.has(key);

              return (
                <Controller
                  key={key}
                  name={`items.${key}.enabled`}
                  control={control}
                  render={({ field }) => (
                    <CollapsibleFormCard
                      value={key}
                      label={method.description}
                      badge={getAccountBadge(itemsData?.[key])}
                      icon={getPaymentIcon(key)}
                      isEnabled={field.value ?? false}
                      isExpanded={isExpanded}
                      onEnabledChange={(checked) => {
                        setWasSaved(false);
                        field.onChange(checked);
                      }}
                      onToggleExpand={() => toggleExpanded(key)}
                    >
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Controller
                            name={`items.${key}.username`}
                            control={control}
                            rules={{
                              validate: (value) => {
                                if (!isEnabled) {
                                  return true;
                                }

                                return !!trimValue(value ?? "") || "Укажите имя получателя";
                              },
                            }}
                            render={({ field: textField }) => (
                              <TextField
                                {...textField}
                                onChange={(event) => {
                                  setWasSaved(false);
                                  textField.onChange(event);
                                }}
                                fullWidth
                                label="Имя получателя"
                                placeholder="Иван Иванов"
                                error={!!errors.items?.[key]?.username}
                                helperText={
                                  errors.items?.[key]?.username?.message ??
                                  "Это имя увидит покупатель"
                                }
                              />
                            )}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <Controller
                            name={`items.${key}.entityValue`}
                            control={control}
                            rules={{
                              validate: (value) => {
                                if (!isEnabled) {
                                  return true;
                                }

                                return !!trimValue(value ?? "") || "Укажите реквизиты";
                              },
                            }}
                            render={({ field: textField }) => (
                              <TextField
                                {...textField}
                                onChange={(event) => {
                                  setWasSaved(false);
                                  textField.onChange(event);
                                }}
                                fullWidth
                                label={getEntityLabel(key)}
                                placeholder={getEntityPlaceholder(key)}
                                error={!!errors.items?.[key]?.entityValue}
                                helperText={
                                  errors.items?.[key]?.entityValue?.message ??
                                  "Обязательное поле для включенного способа оплаты"
                                }
                              />
                            )}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <Controller
                            name={`items.${key}.comment`}
                            control={control}
                            render={({ field: textField }) => (
                              <TextField
                                {...textField}
                                onChange={(event) => {
                                  setWasSaved(false);
                                  textField.onChange(event);
                                }}
                                fullWidth
                                label="Комментарий"
                                placeholder="Дополнительная информация"
                                helperText="Необязательное поле"
                                multiline
                                rows={2}
                              />
                            )}
                          />
                        </Grid>
                      </Grid>
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

export const PaymentAccountsWidget: React.FC = () => {
  const { data: paymentMethods, isLoading: methodsLoading } =
    useDictionary("TRANSFER_MONEY");
  const { data: userAccounts = [], isLoading: accountsLoading } =
    useUserAccounts();

  if (methodsLoading || accountsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  if (!paymentMethods?.length) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        Не удалось загрузить способы оплаты. Попробуйте обновить страницу.
      </Alert>
    );
  }

  return <AccountsForm methods={paymentMethods} existing={userAccounts} />;
};
