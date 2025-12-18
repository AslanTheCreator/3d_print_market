"use client";

import React, { useEffect } from "react";
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
  Grid,
  Collapse,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  CreditCard,
  AccountBalance,
  Payments,
  ExpandMore,
  ExpandLess,
  InfoOutlined,
} from "@mui/icons-material";
import { useForm, Controller } from "react-hook-form";
import { useUserAccounts, useSaveAccountsBatch } from "@/entities/accounts";
import type { AccountsCreateModel } from "@/entities/accounts/model/types";
import { useNotification } from "@/app/providers";
import { useDictionary } from "@/entities/dictionary";

interface FormData {
  methods: {
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

export const AccountsFormWidget = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [expandedMethods, setExpandedMethods] = React.useState<Set<string>>(
    new Set()
  );

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
    defaultValues: { methods: {} },
  });

  const [isInitialized, setIsInitialized] = React.useState(false);

  useEffect(() => {
    if (
      paymentMethods &&
      paymentMethods.length > 0 &&
      userAccounts &&
      !isInitialized
    ) {
      const methodsData: FormData["methods"] = {};
      const expanded = new Set<string>();

      paymentMethods.forEach((method) => {
        const existingAccount = userAccounts.find(
          (acc) => acc.transferMoney === method.value
        );

        if (existingAccount) {
          methodsData[method.value] = {
            enabled: true,
            username: existingAccount.username,
            entityValue: existingAccount.entityValue,
            comment: existingAccount.comment,
          };
          expanded.add(method.value);
        } else {
          methodsData[method.value] = {
            enabled: false,
            username: "",
            entityValue: "",
            comment: "",
          };
        }
      });

      setValue("methods", methodsData, { shouldDirty: false });
      setExpandedMethods(expanded);
      setIsInitialized(true);
    }
  }, [paymentMethods, userAccounts, isInitialized, setValue]);

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

  const onSubmit = async (data: FormData) => {
    const toCreate: AccountsCreateModel[] = [];
    const toDelete: number[] = [];

    paymentMethods?.forEach((method) => {
      const wasEnabled = userAccounts.some(
        (acc) => acc.transferMoney === method.value
      );
      const nowEnabled = !!data.methods[method.value]?.enabled;

      if (nowEnabled && !wasEnabled) {
        toCreate.push({
          transferMoney: method.value as any,
          username: data.methods[method.value].username,
          entityValue: data.methods[method.value].entityValue,
          comment: data.methods[method.value].comment,
        });
      }

      if (!nowEnabled && wasEnabled) {
        const account = userAccounts.find(
          (acc) => acc.transferMoney === method.value
        );
        if (account?.id) toDelete.push(account.id);
      }
    });

    if (toCreate.length === 0 && toDelete.length === 0) {
      showNotification("Ничего не изменилось", "info");
      return;
    }

    await saveBatch({ toCreate, toDelete });
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
              const isExpanded = expandedMethods.has(method.value);
              const isEnabled = methodsData?.[method.value]?.enabled || false;

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
                                  {...field}
                                  checked={field.value || false}
                                  onChange={(e) => {
                                    field.onChange(e.target.checked);
                                    if (e.target.checked) {
                                      handleMethodToggle(method.value);
                                    } else {
                                      setExpandedMethods((prev) => {
                                        const newSet = new Set(prev);
                                        newSet.delete(method.value);
                                        return newSet;
                                      });
                                    }
                                  }}
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
                          {getPaymentIcon(method.value)}
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
                      {isEnabled && (
                        <Box sx={{ ml: 1 }}>
                          {isExpanded ? <ExpandLess /> : <ExpandMore />}
                        </Box>
                      )}
                    </Box>

                    <Collapse in={isEnabled && isExpanded} timeout="auto">
                      <Box sx={{ mt: 3, pl: { xs: 0, sm: 7 } }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <Controller
                              name={`methods.${method.value}.username`}
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
                                  error={
                                    !!errors.methods?.[method.value]?.username
                                  }
                                  helperText={
                                    errors.methods?.[method.value]?.username
                                      ?.message
                                  }
                                  size={isMobile ? "small" : "medium"}
                                />
                              )}
                            />
                          </Grid>

                          <Grid item xs={12}>
                            <Controller
                              name={`methods.${method.value}.entityValue`}
                              control={control}
                              rules={{
                                required: isEnabled
                                  ? "Укажите реквизиты"
                                  : false,
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
                                    !!errors.methods?.[method.value]
                                      ?.entityValue
                                  }
                                  helperText={
                                    errors.methods?.[method.value]?.entityValue
                                      ?.message
                                  }
                                  size={isMobile ? "small" : "medium"}
                                />
                              )}
                            />
                          </Grid>

                          <Grid item xs={12}>
                            <Controller
                              name={`methods.${method.value}.comment`}
                              control={control}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  fullWidth
                                  label="Комментарий (необязательно)"
                                  placeholder="Дополнительная информация"
                                  multiline
                                  rows={2}
                                  size={isMobile ? "small" : "medium"}
                                />
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
