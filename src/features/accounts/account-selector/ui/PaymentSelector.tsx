"use client";

import React, { useMemo } from "react";
import {
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormHelperText,
  Box,
  Typography,
  Skeleton,
  Alert,
  Chip,
} from "@mui/material";
import { Control, Controller, FieldError } from "react-hook-form";
import { CreditCard, Smartphone, Banknote } from "lucide-react";
import {
  AccountsBaseModel,
  TransferMoney,
} from "@/entities/accounts/model/types";
import { useTransferMoney } from "@/entities/dictionary/hooks/useDictionaryVariants";
import { DictionaryItem } from "@/entities/dictionary/model/types";
import { useUserAccounts } from "@/entities/accounts/hooks";

interface PaymentSelectorProps {
  control: Control<any>;
  paymentMethodName: string;
  accountIdName?: string;
  error?: FieldError;
  disabled?: boolean;
  onPaymentSelect?: (payment: AccountsBaseModel | null) => void;
  showDescriptions?: boolean;
  hideUnavailable?: boolean;
}

const PaymentIcons: Record<
  TransferMoney,
  React.ComponentType<{ width?: number; height?: number }>
> = {
  BANK_CARD: CreditCard,
  BANK_SBP: Smartphone,
  CASH: Banknote,
};

const PaymentLabels: Record<TransferMoney, string> = {
  BANK_CARD: "Банковская карта",
  BANK_SBP: "СБП",
  CASH: "Наличные",
};

export const PaymentSelector: React.FC<PaymentSelectorProps> = ({
  control,
  paymentMethodName,
  error,
  disabled = false,
  onPaymentSelect,
  showDescriptions = true,
  hideUnavailable = false,
}) => {
  const {
    data: paymentMethods,
    isLoading: methodsLoading,
    isError: methodsError,
    error: queryError,
  } = useUserAccounts();

  const {
    data: transferMoney,
    isLoading: transferMoneyLoading,
    isError: transferMoneyError,
  } = useTransferMoney();

  const isLoading = methodsLoading || transferMoneyLoading;
  const isError = methodsError || transferMoneyError;

  // Создаем маппинг методов для быстрого поиска
  const methodsMap = useMemo(() => {
    if (!transferMoney) return new Map();

    return new Map(
      transferMoney.map((method: DictionaryItem) => [method.value, method])
    );
  }, [transferMoney]);

  // Функция для получения информации о методе оплаты
  const getMethodInfo = (method: TransferMoney) => {
    const methodInfo = methodsMap.get(method);
    return {
      label: PaymentLabels[method] || methodInfo?.description || method,
      description: methodInfo?.description || "",
    };
  };

  // Фильтруем доступные методы оплаты
  const availableMethods = useMemo(() => {
    if (!paymentMethods || !transferMoney) return [];

    return paymentMethods.filter((method) => {
      if (hideUnavailable) {
        // Показываем только доступные методы
        return methodsMap.has(method.transferMoney);
      }
      return true;
    });
  }, [paymentMethods, transferMoney, methodsMap, hideUnavailable]);

  // Обработчик выбора способа оплаты
  const handlePaymentChange = (
    methodValue: string,
    onChange: (value: any) => void
  ) => {
    const selectedMethod =
      availableMethods?.find((m) => m.id.toString() === methodValue) || null;
    onChange(methodValue);
    onPaymentSelect?.(selectedMethod);
  };

  // Отображение загрузки
  if (isLoading) {
    return (
      <Box>
        {[1, 2, 3].map((index) => (
          <Box
            key={index}
            sx={{ display: "flex", alignItems: "center", mb: 1 }}
          >
            <Skeleton
              variant="circular"
              width={20}
              height={20}
              sx={{ mr: 1 }}
            />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="60%" height={24} />
              {showDescriptions && (
                <Skeleton variant="text" width="40%" height={16} />
              )}
            </Box>
          </Box>
        ))}
      </Box>
    );
  }

  // Отображение ошибки
  if (isError) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {queryError?.message || "Ошибка при загрузке данных"}
      </Alert>
    );
  }

  // Отображение пустого списка
  if (!availableMethods || availableMethods.length === 0) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        Способы оплаты не найдены
      </Alert>
    );
  }

  return (
    <FormControl
      component="fieldset"
      fullWidth
      error={!!error}
      disabled={disabled}
    >
      <Controller
        name={paymentMethodName}
        control={control}
        rules={{ required: "Выберите способ оплаты" }}
        render={({ field: { onChange, value, ...field } }) => (
          <RadioGroup
            {...field}
            value={value || ""}
            onChange={(e) => handlePaymentChange(e.target.value, onChange)}
          >
            {availableMethods.map((method) => {
              const methodInfo = getMethodInfo(method.transferMoney);
              const isSelected = value === method.id.toString();
              const IconComponent = PaymentIcons[method.transferMoney];

              return (
                <Box key={method.id} sx={{ mb: 1 }}>
                  <FormControlLabel
                    value={method.id.toString()}
                    control={<Radio />}
                    disabled={disabled}
                    label={
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          ml: 1,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            flex: 1,
                          }}
                        >
                          <IconComponent width={20} height={20} />
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              variant="body1"
                              component="div"
                              sx={{
                                fontWeight: isSelected ? 600 : 400,
                                mb: showDescriptions ? 0.5 : 0,
                              }}
                            >
                              {methodInfo.label}
                            </Typography>

                            {showDescriptions && methodInfo.description && (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                component="div"
                              >
                                {methodInfo.description}
                              </Typography>
                            )}
                          </Box>
                        </Box>

                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            ml: 2,
                          }}
                        >
                          <Chip
                            size="small"
                            label={`${paymentMethods?.length || 0} аккаунтов`}
                            variant="outlined"
                            color={isSelected ? "primary" : "default"}
                          />
                        </Box>
                      </Box>
                    }
                    sx={{
                      width: "100%",
                      m: 0,
                      p: 2,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: isSelected ? "primary.main" : "divider",
                      backgroundColor: "transparent",
                      "&:hover": {
                        backgroundColor: "action.hover",
                      },
                      transition: "all 0.2s ease-in-out",
                      // opacity: method.available ? 1 : 0.6,
                    }}
                  />
                </Box>
              );
            })}
          </RadioGroup>
        )}
      />
      {error && <FormHelperText>{error.message}</FormHelperText>}
    </FormControl>
  );
};
