import React, { useMemo } from "react";
import {
  FormControl,
  FormControlLabel,
  FormHelperText,
  RadioGroup,
  Radio,
  Typography,
  Box,
  Skeleton,
  Alert,
  Chip,
} from "@mui/material";
import { Controller, Control, FieldError } from "react-hook-form";
import {
  ShoppingMethods,
  TransferBaseModel,
} from "@/entities/transfer/model/types";
import { useShoppingMethods } from "@/shared/model/dictionary/useDictionaryHooks";
import { DictionaryItem } from "@/shared/api/dictionary/types";
import { formatPrice } from "@/shared/lib/formatPrice";

interface TransferSelectorProps {
  control: Control<any>;
  name: string;
  error?: FieldError;
  disabled?: boolean;
  onTransferSelect?: (transfer: TransferBaseModel | null) => void;
  showDescriptions?: boolean;
  hideUnavailable?: boolean;
  transfers: TransferBaseModel[];
  isLoading?: boolean;
  isError?: boolean;
}

export const TransferSelector: React.FC<TransferSelectorProps> = ({
  control,
  name,
  error,
  disabled = false,
  onTransferSelect,
  showDescriptions = true,
  hideUnavailable = false,
  transfers,
  isLoading: transfersLoading = false,
  isError: transfersError = false,
}) => {
  const {
    data: shoppingMethods,
    isLoading: methodsLoading,
    isError: methodsError,
  } = useShoppingMethods();

  const isLoading = transfersLoading || methodsLoading;
  const isError = transfersError || methodsError;

  // Создаем маппинг методов для быстрого поиска
  const methodsMap = useMemo(() => {
    if (!shoppingMethods) return new Map();

    return new Map(
      shoppingMethods.map((method: DictionaryItem) => [method.value, method])
    );
  }, [shoppingMethods]);

  // Функция для получения информации о методе доставки
  const getMethodInfo = (method: ShoppingMethods) => {
    const methodInfo = methodsMap.get(method);
    return {
      label: methodInfo?.description || method,
      description: methodInfo?.description || "",
    };
  };

  // Фильтруем доступные методы доставки
  const availableTransfers = useMemo(() => {
    if (!transfers || !shoppingMethods) return [];

    return transfers.filter((transfer) => {
      if (hideUnavailable) {
        // Показываем только те методы, которые есть в dictionary
        return methodsMap.has(transfer.sending);
      }
      return true;
    });
  }, [transfers, shoppingMethods, methodsMap, hideUnavailable]);

  // Обработчик выбора способа доставки
  const handleTransferChange = (
    transferId: string,
    onChange: (value: any) => void
  ) => {
    const selectedTransfer =
      availableTransfers?.find((t) => t.id.toString() === transferId) || null;
    onChange(transferId);
    onTransferSelect?.(selectedTransfer);
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
        {error?.message || "Ошибка при загрузке данных"}
      </Alert>
    );
  }

  // Отображение пустого списка
  if (!availableTransfers || availableTransfers.length === 0) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        Способы доставки не найдены
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
        name={name}
        control={control}
        rules={{ required: "Выберите способ доставки" }}
        render={({ field: { onChange, value, ...field } }) => (
          <RadioGroup
            {...field}
            value={value || ""}
            onChange={(e) => handleTransferChange(e.target.value, onChange)}
          >
            {availableTransfers.map((transfer) => {
              const methodInfo = getMethodInfo(transfer.sending);
              const isSelected = value === transfer.id.toString();

              return (
                <Box key={transfer.id} sx={{ mb: 1 }}>
                  <FormControlLabel
                    value={transfer.id.toString()}
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

                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            ml: 2,
                          }}
                        >
                          {transfer.price === 0 ? (
                            <Chip
                              label="Бесплатно"
                              size="small"
                              color="success"
                              variant="outlined"
                            />
                          ) : (
                            <Chip
                              label={formatPrice(
                                transfer.price,
                                transfer.currency
                              )}
                              size="small"
                              variant="outlined"
                              color={isSelected ? "primary" : "default"}
                            />
                          )}
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
