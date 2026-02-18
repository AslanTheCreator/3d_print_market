"use client";

import React from "react";
import {
  Box,
  TextField,
  Button,
  Stack,
  Typography,
  FormControl,
  Grid,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  CreditCard,
  AccountBalance,
  Payments,
  InfoOutlined,
} from "@mui/icons-material";
import { useForm, Controller } from "react-hook-form";
import { useUserAccounts, useSaveAccountsBatch } from "@/entities/accounts";
import type { AccountsBaseModel } from "@/shared/types";
import { useNotification } from "@/app/providers";
import { useDictionary } from "@/entities/dictionary";
import { CollapsibleFormCard } from "@/shared/ui/collapsible-form-card/CollapsibleFormCard";
import { useBatchForm } from "@/shared/hooks/useBatchForm";
import { useFormInitializer } from "@/shared/hooks/useFormInitializer";

interface FormData {
  items: {
    [key: string]: {
      enabled: boolean;
      username: string;
      entityValue: string;
      comment: string;
    };
  };
}

const getPaymentIcon = (value: string) => {
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
};

// Функция сравнения для определения изменений
const compareAccountData = (
  existing: AccountsBaseModel,
  formData: any,
): boolean => {
  return (
    existing.username === formData.username &&
    existing.entityValue === formData.entityValue &&
    existing.comment === (formData.comment || "")
  );
};

export const AccountsFormWidget = () => {
  const { data: paymentMethods, isLoading: methodsLoading } =
    useDictionary("TRANSFER_MONEY");
  const { data: userAccounts = [], isLoading: accountsLoading } =
    useUserAccounts();
  const { mutateAsync: saveBatch, isPending } = useSaveAccountsBatch();
  const { showNotification } = useNotification();

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
    existingItems: userAccounts,
    getItemKey: (item) => item.transferMoney,
    mapToCreateModel: (data, key) => ({
      transferMoney: key as any,
      username: data.username,
      entityValue: data.entityValue,
      comment: data.comment || "",
    }),
    getItemId: (item) => item.id,
    compareItemData: compareAccountData,
  });

  useFormInitializer({
    dictionaryItems: paymentMethods,
    existingItems: userAccounts,
    isLoading: accountsLoading,
    setValue,
    getDictionaryKey: (item) => item.value,
    getExistingKey: (item) => item.transferMoney,
    mapExistingToFormData: (item) => ({
      username: item.username,
      entityValue: item.entityValue,
      comment: item.comment || "",
    }),
    getDefaultFormData: () => ({ username: "", entityValue: "", comment: "" }),
    onInitialized: (expanded) => {
      expanded.forEach((key) => toggleExpanded(key));
    },
  });

  const itemsData = watch("items");

  const onSubmit = async (data: FormData) => {
    const { toCreate, toDelete, toUpdate } = computeChanges(data.items);

    // Для accounts мы удаляем старые и создаем новые при изменениях
    const itemsToDelete = [...toDelete];
    const itemsToCreate = [...toCreate];

    // Добавляем обновленные элементы: удаляем старые, создаем новые
    toUpdate.forEach(({ id, data }) => {
      itemsToDelete.push(id);
      itemsToCreate.push(data);
    });

    if (itemsToCreate.length === 0 && itemsToDelete.length === 0) {
      showNotification("Ничего не изменилось", "info");
      return;
    }

    await saveBatch({ toCreate: itemsToCreate, toDelete: itemsToDelete });
  };

  if (accountsLoading || methodsLoading) {
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

  if (!paymentMethods || !paymentMethods.length) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        Не удалось загрузить способы оплаты. Попробуйте обновить страницу.
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
        Выберите способы оплаты товара и укажите необходимую информацию. Эта
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
            Выберите способы оплаты
          </Typography>

          <Stack spacing={2}>
            {paymentMethods.map((method) => {
              const isEnabled = itemsData?.[method.value]?.enabled || false;
              const isExpd = isExpanded(method.value);

              return (
                <Controller
                  key={method.value}
                  name={`items.${method.value}.enabled`}
                  control={control}
                  render={({ field }) => (
                    <CollapsibleFormCard
                      value={method.value}
                      label={method.description}
                      icon={getPaymentIcon(method.value)}
                      isEnabled={field.value || false}
                      isExpanded={isExpd}
                      onEnabledChange={field.onChange}
                      onToggleExpand={() => toggleExpanded(method.value)}
                    >
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Controller
                            name={`items.${method.value}.username`}
                            control={control}
                            rules={{
                              required: isEnabled
                                ? "Укажите имя получателя"
                                : false,
                            }}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                fullWidth
                                label="Имя получателя"
                                placeholder="Иван Иванов"
                                error={!!errors.items?.[method.value]?.username}
                                helperText={
                                  errors.items?.[method.value]?.username
                                    ?.message
                                }
                              />
                            )}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <Controller
                            name={`items.${method.value}.entityValue`}
                            control={control}
                            rules={{
                              required: isEnabled ? "Укажите реквизиты" : false,
                            }}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                fullWidth
                                label={
                                  method.value === "BANK_CARD"
                                    ? "Номер карты"
                                    : method.value === "BANK_SBP"
                                      ? "Номер телефона"
                                      : "Способ передачи"
                                }
                                placeholder={
                                  method.value === "BANK_CARD"
                                    ? "0000 0000 0000 0000"
                                    : method.value === "BANK_SBP"
                                      ? "+7 (000) 000-00-00"
                                      : "Укажите детали"
                                }
                                error={
                                  !!errors.items?.[method.value]?.entityValue
                                }
                                helperText={
                                  errors.items?.[method.value]?.entityValue
                                    ?.message
                                }
                              />
                            )}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <Controller
                            name={`items.${method.value}.comment`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                fullWidth
                                label="Комментарий (необязательно)"
                                placeholder="Дополнительная информация"
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
